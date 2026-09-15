-- Indexes on sof.* materialized tables (SQL on FHIR ViewDefinitions)
--
-- $materialize drops and recreates the tables — indexes are lost.
-- Re-run this script after every $materialize call.

-- patient_id / id lookups
CREATE INDEX IF NOT EXISTS idx_sof_patient_id ON sof.patient_flat(id);
CREATE INDEX IF NOT EXISTS idx_sof_encounter_patient ON sof.encounter_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_condition_patient ON sof.condition_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_patient ON sof.procedure_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_observation_patient ON sof.observation_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_servicerequest_patient ON sof.servicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_medicationrequest_patient ON sof.medicationrequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_devicerequest_patient ON sof.devicerequest_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_bp_patient ON sof.observation_bp_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_immunization_patient ON sof.immunization_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_task_patient ON sof.task_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_communication_patient ON sof.communication_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_medadmin_patient ON sof.medicationadministration_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_allergy_patient ON sof.allergyintolerance_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_adverseevent_patient ON sof.adverseevent_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_meddispense_patient ON sof.medicationdispense_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_diagnosticreport_patient ON sof.diagnosticreport_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_claimdx_patient ON sof.claim_diagnosis_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_device_patient ON sof.device_flat(patient_id);
CREATE INDEX IF NOT EXISTS idx_sof_specimen_patient ON sof.specimen_flat(patient_id);

-- code/system lookups (concepts JOIN per measure CTE)
CREATE INDEX IF NOT EXISTS idx_sof_encounter_type ON sof.encounter_flat(type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_condition_code ON sof.condition_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_procedure_code ON sof.procedure_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_observation_code ON sof.observation_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_observation_value ON sof.observation_flat(value_system, value_code);
CREATE INDEX IF NOT EXISTS idx_sof_immunization_code ON sof.immunization_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_task_code ON sof.task_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_communication_category ON sof.communication_flat(category_system, category_code);
CREATE INDEX IF NOT EXISTS idx_sof_medadmin_code ON sof.medicationadministration_flat(med_system, med_code);
CREATE INDEX IF NOT EXISTS idx_sof_allergy_code ON sof.allergyintolerance_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_adverseevent_code ON sof.adverseevent_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_meddispense_code ON sof.medicationdispense_flat(med_system, med_code);
CREATE INDEX IF NOT EXISTS idx_sof_diagnosticreport_code ON sof.diagnosticreport_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_claimdx_code ON sof.claim_diagnosis_flat(diagnosis_system, diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_sof_location_type ON sof.location_flat(type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_medication_code ON sof.medication_flat(code_system, code);
CREATE INDEX IF NOT EXISTS idx_sof_device_type ON sof.device_flat(type_system, type_code);
CREATE INDEX IF NOT EXISTS idx_sof_specimen_type ON sof.specimen_flat(type_system, type_code);

-- Composite covering — verified via EXPLAIN ANALYZE that the planner picks
-- this for cms130/cms131/cms143/cms149/cms155 condition lookups (Bitmap Heap
-- Scan over patient_id + code_system + code). Encounter equivalent was tried
-- and dropped: planner never selected it and its presence caused a Hash→Merge
-- join flip in cms153 that regressed that measure.
CREATE INDEX IF NOT EXISTS idx_sof_condition_patient_code ON sof.condition_flat(patient_id, code_system, code);

-- ANALYZE so planner has fresh row estimates immediately after $materialize.
-- Autovacuum picks up eventually but explicit ANALYZE removes the lag.
ANALYZE sof.patient_flat, sof.encounter_flat, sof.condition_flat,
        sof.procedure_flat, sof.observation_flat, sof.observation_bp_flat,
        sof.servicerequest_flat, sof.medicationrequest_flat, sof.devicerequest_flat,
        sof.immunization_flat, sof.task_flat, sof.communication_flat,
        sof.medicationadministration_flat, sof.allergyintolerance_flat,
        sof.adverseevent_flat, sof.medicationdispense_flat, sof.diagnosticreport_flat,
        sof.claim_diagnosis_flat, sof.location_flat, sof.medication_flat,
        sof.device_flat, sof.specimen_flat;
