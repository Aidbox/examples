-- Indexes on sof.* materialized tables (SQL on FHIR ViewDefinitions)
--
-- $materialize drops and recreates the tables — indexes are lost.
-- Re-run this script after every $materialize call.

CREATE INDEX IF NOT EXISTS idx_sof_encounter_patient ON sof.encounter_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_encounter_type ON sof.encounter_flat(type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_condition_patient ON sof.condition_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_condition_code ON sof.condition_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_patient ON sof.procedure_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_code ON sof.procedure_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_observation_patient ON sof.observation_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_observation_code ON sof.observation_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_servicerequest_patient ON sof.servicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_medicationrequest_patient ON sof.medicationrequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_devicerequest_patient ON sof.devicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_bp_patient ON sof.observation_bp_flat(patient_id);
