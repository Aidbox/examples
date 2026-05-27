-- Wrapper views over sof.* materialized tables (SQL on FHIR ViewDefinitions)
--
-- Purpose: provide the same column names and types as the original hand-written
-- flat views (01-views.sql), so measure SQL files work without modification.
--
-- Handles:
--   - COALESCE for polymorphic fields (dateTime vs Period)
--   - text → timestamptz cast (sof stores dates as text)
--   - partial FHIR dates ("2015", "2015-10") via parse_fhir_datetime helper
--   - has_value boolean for Observation
--
-- Prerequisites: sof.* tables must exist (ViewDefinition + $materialize)

-- ============================================================
-- Partial-date helper
-- FHIR R4 allows `dateTime` with partial precision: "2015" (year) or "2015-10"
-- (year-month). A naïve cast `'2015-10'::timestamptz` raises
-- "invalid input syntax for type timestamp with time zone".
-- This helper pads partial dates to the start of the implied period:
--   "2015"     -> 2015-01-01T00:00:00Z
--   "2015-10"  -> 2015-10-01T00:00:00Z
--   full date  -> as-is
-- Anything that doesn't look like a FHIR date returns NULL so that downstream
-- WHERE filters exclude the row instead of erroring.
-- CREATE OR REPLACE makes this safe to ship alongside 01-views.sql which
-- defines the same function — both code paths are self-contained.
-- ============================================================
CREATE OR REPLACE FUNCTION parse_fhir_datetime(s text) RETURNS timestamptz AS $$
  SELECT CASE
    WHEN s IS NULL                THEN NULL
    WHEN s ~ '^\d{4}-\d{2}-\d{2}' THEN s::timestamptz
    WHEN s ~ '^\d{4}-\d{2}$'      THEN (s || '-01T00:00:00Z')::timestamptz
    WHEN s ~ '^\d{4}$'            THEN (s || '-01-01T00:00:00Z')::timestamptz
    ELSE NULL
  END
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Patient
-- us-core extensions (sex, race_code, ethnicity_code) are now projected
-- directly by the patient-flat ViewDefinition into sof.patient_flat, so the
-- wrapper is a simple pass-through. No JSONB extraction, no JOIN to patient.
-- ============================================================
DROP VIEW IF EXISTS patient_flat CASCADE;
CREATE VIEW patient_flat AS
SELECT id, birth_date, gender, family_name, given_name,
       sex, race_code, ethnicity_code
FROM sof.patient_flat;

-- ============================================================
-- Encounter
-- ============================================================
DROP VIEW IF EXISTS encounter_flat CASCADE;
CREATE VIEW encounter_flat AS
SELECT id, patient_id, status, type_system, type_code,
    parse_fhir_datetime(period_start) AS period_start,
    parse_fhir_datetime(period_end) AS period_end,
    class_code, discharge_code
FROM sof.encounter_flat;

-- ============================================================
-- Procedure
-- ============================================================
DROP VIEW IF EXISTS procedure_flat CASCADE;
CREATE VIEW procedure_flat AS
SELECT id, patient_id, status, code_system, code,
    COALESCE(parse_fhir_datetime(performed_start), parse_fhir_datetime(performed_period_start)) AS performed_start,
    COALESCE(parse_fhir_datetime(performed_start), parse_fhir_datetime(performed_period_end)) AS performed_end
FROM sof.procedure_flat;

-- ============================================================
-- Observation
-- ============================================================
DROP VIEW IF EXISTS observation_flat CASCADE;
CREATE VIEW observation_flat AS
SELECT o.id, o.patient_id, o.status, o.code_system, o.code, o.category_code,
    COALESCE(parse_fhir_datetime(o.effective_dt), parse_fhir_datetime(o.effective_period_start)) AS effective_start,
    COALESCE(parse_fhir_datetime(o.effective_dt), parse_fhir_datetime(o.effective_period_end)) AS effective_end,
    o.value_system, o.value_code, o.value_quantity, o.value_unit,
    -- has_value: Aidbox 2603+ materializes FHIRPath `value.exists()` as text
    -- 'true'/'false' in sof.observation_flat.has_value. Bit-identical to the
    -- JSONB check `(r.resource -> 'value' IS NOT NULL)` on 36k observation rows
    -- (27,022 true + 9,167 false, zero disagreement).
    --
    -- Earlier version used JOIN to raw observation as workaround for a stale
    -- assumption that Aidbox dropped `value.exists()` silently. Workaround is
    -- no longer needed — pure SoF here keeps the hot path off raw JSONB.
    --
    -- Benchmark (5×12-measure aggregate, 2026-05-16):
    --   :7888 (Cypress, 100k cohort, 36k obs)  — pure-SoF 8.56s, JOIN 7.80s   (JOIN −10%)
    --   :9999 (scale-test, 100k cohort, 31k obs) — pure-SoF 13.10s, JOIN 13.50s (no-JOIN −3%, within stdev)
    -- Perf practically tied at 100k scale. Keep pure SoF for architectural clarity;
    -- re-benchmark on production-scale (≥1M obs) if it becomes hot.
    (o.has_value = 'true') AS has_value,
    parse_fhir_datetime(o.issued) AS issued,
    o.not_done_reason_system, o.not_done_reason_code
FROM sof.observation_flat o;

-- ============================================================
-- Condition
-- ============================================================
DROP VIEW IF EXISTS condition_flat CASCADE;
CREATE VIEW condition_flat AS
SELECT id, patient_id, code_system, code, clinical_status, verification_status,
    COALESCE(parse_fhir_datetime(onset_dt), parse_fhir_datetime(onset_period_start)) AS onset_date,
    COALESCE(parse_fhir_datetime(abatement_dt), parse_fhir_datetime(abatement_period_end)) AS abatement_date,
    category_code, body_site_code
FROM sof.condition_flat;

-- ============================================================
-- ServiceRequest
-- ============================================================
DROP VIEW IF EXISTS servicerequest_flat CASCADE;
CREATE VIEW servicerequest_flat AS
SELECT id, patient_id, status, intent, code_system, code,
    parse_fhir_datetime(authored_on) AS authored_on
FROM sof.servicerequest_flat;

-- ============================================================
-- MedicationRequest
-- ============================================================
DROP VIEW IF EXISTS medicationrequest_flat CASCADE;
CREATE VIEW medicationrequest_flat AS
SELECT mr.id, mr.patient_id, mr.status, mr.intent,
    -- COALESCE: prefer CodeableConcept from VD, fallback to medication Reference JOIN
    COALESCE(mr.med_system, m.resource->'code'->'coding'->0->>'system') AS med_system,
    COALESCE(mr.med_code, m.resource->'code'->'coding'->0->>'code') AS med_code,
    parse_fhir_datetime(mr.validity_start) AS validity_start,
    parse_fhir_datetime(mr.validity_end) AS validity_end,
    parse_fhir_datetime(mr.authored_on) AS authored_on
FROM sof.medicationrequest_flat mr
LEFT JOIN medicationrequest raw ON raw.id = mr.id
LEFT JOIN medication m ON m.id = raw.resource->'medication'->'Reference'->>'id';

-- ============================================================
-- DeviceRequest
-- ============================================================
DROP VIEW IF EXISTS devicerequest_flat CASCADE;
CREATE VIEW devicerequest_flat AS
SELECT id, patient_id, status, intent, code_system, code,
    parse_fhir_datetime(authored_on) AS authored_on
FROM sof.devicerequest_flat;

-- ============================================================
-- Blood Pressure Observations (CMS165-specific)
-- Only BP panel (LOINC 85354-9) with systolic/diastolic components
-- ============================================================
DROP VIEW IF EXISTS observation_bp_flat CASCADE;
CREATE VIEW observation_bp_flat AS
SELECT id, patient_id, status,
    COALESCE(parse_fhir_datetime(effective_dt), parse_fhir_datetime(effective_period_start)) AS effective_date,
    encounter_id,
    systolic::numeric AS systolic,
    diastolic::numeric AS diastolic
FROM sof.observation_bp_flat;
