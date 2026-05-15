-- Performance Optimizations for Measure SQL
-- Run AFTER 01-views.sql and 02-shared-exclusions.sql
-- Safe to re-run (all CREATE INDEX IF NOT EXISTS, ANALYZE is idempotent)
--
-- Contains:
--   1. Btree indexes on FHIR resource JSONB paths (speeds up flat view scans)
--   2. ANALYZE to update planner statistics
--
-- Note on date-range indexes:
--   text->timestamp casts are STABLE, not IMMUTABLE — Postgres refuses to
--   index expressions like ((resource->'period'->>'start')::timestamptz).
--   Subject indexes below filter to one patient first; date filtering is then in-memory.

-- ============================================================
-- 1. Indexes on FHIR resource tables
-- These speed up the flat views by allowing index scans on JSONB paths.
-- Named with ix_ prefix to distinguish from Aidbox's own indexes.
-- ============================================================

-- Patient: birthDate (age calculations), gender
CREATE INDEX IF NOT EXISTS ix_patient_birthdate ON patient ((resource->>'birthDate'));
CREATE INDEX IF NOT EXISTS ix_patient_gender ON patient ((resource->>'gender'));

-- status columns are deliberately NOT indexed across all resources: the column
-- has 3–5 distinct values in real data with one value (finished / final /
-- completed / active) covering 90 %+ of rows, so the planner will prefer a
-- sequential scan over a low-selectivity btree.

-- Encounter: subject, type coding
CREATE INDEX IF NOT EXISTS ix_encounter_subject ON encounter ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_encounter_type_code ON encounter ((resource->'type'->0->'coding'->0->>'system'), (resource->'type'->0->'coding'->0->>'code'));

-- Observation: subject, code, value code
CREATE INDEX IF NOT EXISTS ix_observation_subject ON observation ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_observation_code ON observation ((resource->'code'->'coding'->0->>'system'), (resource->'code'->'coding'->0->>'code'));
CREATE INDEX IF NOT EXISTS ix_observation_value_code ON observation ((resource->'value'->'CodeableConcept'->'coding'->0->>'code')) WHERE resource->'value'->'CodeableConcept' IS NOT NULL;

-- Condition: subject, code
CREATE INDEX IF NOT EXISTS ix_condition_subject ON condition ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_condition_code ON condition ((resource->'code'->'coding'->0->>'system'), (resource->'code'->'coding'->0->>'code'));

-- Procedure: subject, code
CREATE INDEX IF NOT EXISTS ix_procedure_subject ON procedure ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_procedure_code ON procedure ((resource->'code'->'coding'->0->>'system'), (resource->'code'->'coding'->0->>'code'));

-- ServiceRequest: subject, code
CREATE INDEX IF NOT EXISTS ix_servicerequest_subject ON servicerequest ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_servicerequest_code ON servicerequest ((resource->'code'->'coding'->0->>'system'), (resource->'code'->'coding'->0->>'code'));

-- MedicationRequest: subject, medication code
CREATE INDEX IF NOT EXISTS ix_medrq_subject ON medicationrequest ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_medrq_med_code ON medicationrequest ((resource->'medication'->'CodeableConcept'->'coding'->0->>'system'), (resource->'medication'->'CodeableConcept'->'coding'->0->>'code'));

-- DeviceRequest: subject, code
CREATE INDEX IF NOT EXISTS ix_devicerq_subject ON devicerequest ((resource->'subject'->>'id'));
CREATE INDEX IF NOT EXISTS ix_devicerq_code ON devicerequest ((resource->'code'->'CodeableConcept'->'coding'->0->>'system'), (resource->'code'->'CodeableConcept'->'coding'->0->>'code'));

-- Observation: partial index for BP panel (observation_bp_flat legacy view)
-- Dramatically reduces rows scanned for CMS165 on legacy path
CREATE INDEX IF NOT EXISTS ix_observation_bp ON observation ((resource->'code'->'coding'->0->>'code')) WHERE resource->'code'->'coding'->0->>'code' = '85354-9';

-- Encounter: class code (CMS165 disqualifying encounters)
CREATE INDEX IF NOT EXISTS ix_encounter_class ON encounter ((resource->'class'->>'code'));

-- ============================================================
-- 2. Update planner statistics
-- On a fresh sample these complete in seconds. On a production-scale install
-- with millions of rows each ANALYZE may take minutes — budget accordingly.
-- ============================================================
ANALYZE concepts;
ANALYZE patient;
ANALYZE encounter;
ANALYZE observation;
ANALYZE condition;
ANALYZE procedure;
ANALYZE servicerequest;
ANALYZE medicationrequest;
ANALYZE devicerequest;
