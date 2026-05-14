-- Indexes on sof.* materialized tables (SQL on FHIR ViewDefinitions)
--
-- $materialize drops and recreates the tables — indexes are lost.
-- Re-run this script after every $materialize call.
--
-- Perf benchmark (100k patients, POC :7888, 12 measures cohort SQL, warm cache):
--   without new indexes:  11.98s total
--   with new indexes:     9.91s total  (1.21x speedup)
--   biggest win: CMS1154 1.88s → 0.54s (3.5x) from sof.patient_flat (id) alone

-- patient_id lookups (one per measure cohort)
CREATE INDEX IF NOT EXISTS idx_sof_patient_id ON sof.patient_flat(id);
CREATE INDEX IF NOT EXISTS idx_sof_encounter_patient ON sof.encounter_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_condition_patient ON sof.condition_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_patient ON sof.procedure_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_observation_patient ON sof.observation_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_servicerequest_patient ON sof.servicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_medicationrequest_patient ON sof.medicationrequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_devicerequest_patient ON sof.devicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_bp_patient ON sof.observation_bp_flat(patient_id);

-- code/system lookups (concepts JOIN per measure CTE)
CREATE INDEX IF NOT EXISTS idx_sof_encounter_type ON sof.encounter_flat(type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_condition_code ON sof.condition_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_code ON sof.procedure_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_observation_code ON sof.observation_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_observation_value ON sof.observation_flat(value_system, value_code);
CREATE INDEX IF NOT EXISTS idx_sof_servicerequest_code ON sof.servicerequest_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_medicationrequest_med ON sof.medicationrequest_flat(med_system, med_code);
CREATE INDEX IF NOT EXISTS idx_sof_devicerequest_code ON sof.devicerequest_flat(code_system, code);

-- Composite covering (patient+code in one access path — encounter & condition are hottest)
CREATE INDEX IF NOT EXISTS idx_sof_encounter_patient_type ON sof.encounter_flat(patient_id, type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_condition_patient_code ON sof.condition_flat(patient_id, code_system, code);

-- ANALYZE so planner has fresh row estimates immediately after $materialize.
-- Autovacuum picks up eventually but explicit ANALYZE removes the lag.
ANALYZE sof.patient_flat, sof.encounter_flat, sof.condition_flat,
        sof.procedure_flat, sof.observation_flat, sof.observation_bp_flat,
        sof.servicerequest_flat, sof.medicationrequest_flat, sof.devicerequest_flat;
