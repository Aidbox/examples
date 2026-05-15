-- Shared ViewDefinitions
-- Flattened projections of FHIR resources for SQL-based measure calculation
-- Reusable across all measures (CMS130, CMS125, CMS131, CMS165, etc.)
--
-- IMPORTANT: Uses Aidbox JSONB storage format:
--   - subject reference: resource->'subject'->>'id' (not resource->'subject'->>'reference')
--   - polymorphic fields: resource->'performed'->'dateTime' (not resource->>'performedDateTime')
--   - polymorphic fields: resource->'performed'->'Period'->>'start' (not resource->'performedPeriod'->>'start')

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
-- ============================================================
DROP VIEW IF EXISTS patient_flat CASCADE;
CREATE VIEW patient_flat AS
SELECT
    r.id,
    r.resource->>'birthDate' AS birth_date,
    r.resource->>'gender' AS gender,
    -- us-core-sex extension: Patient.sex in QICore (SNOMED code, e.g. 248152002 = Female)
    -- Aidbox edge stores as value.code, Aidbox 2506 stores as valueCode — support both
    (SELECT COALESCE(ext->'value'->>'code', ext->>'valueCode')
     FROM jsonb_array_elements(r.resource->'extension') ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex'
     LIMIT 1) AS sex,
    -- us-core-race extension: ombCategory code (e.g. 1002-5 = American Indian, 2054-5 = Black, 2106-3 = White, 2028-9 = Asian)
    -- Aidbox edge: value.Coding.code, Aidbox 2506: valueCoding.code — support both
    (SELECT COALESCE(sub_ext->'value'->'Coding'->>'code', sub_ext->'valueCoding'->>'code', sub_ext->'value'->>'code')
     FROM jsonb_array_elements(r.resource->'extension') ext,
          LATERAL jsonb_array_elements(ext->'extension') sub_ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
       AND sub_ext->>'url' = 'ombCategory'
     LIMIT 1) AS race_code,
    -- us-core-ethnicity extension: ombCategory code (e.g. 2135-2 = Hispanic, 2186-5 = Non-Hispanic)
    (SELECT COALESCE(sub_ext->'value'->'Coding'->>'code', sub_ext->'valueCoding'->>'code', sub_ext->'value'->>'code')
     FROM jsonb_array_elements(r.resource->'extension') ext,
          LATERAL jsonb_array_elements(ext->'extension') sub_ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
       AND sub_ext->>'url' = 'ombCategory'
     LIMIT 1) AS ethnicity_code,
    r.resource->'name'->0->>'family' AS family_name,
    r.resource->'name'->0->'given'->>0 AS given_name
FROM patient r;

-- ============================================================
-- Encounter
-- ============================================================
DROP VIEW IF EXISTS encounter_flat CASCADE;
CREATE VIEW encounter_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->'type'->0->'coding'->0->>'system' AS type_system,
    r.resource->'type'->0->'coding'->0->>'code' AS type_code,
    parse_fhir_datetime(r.resource->'period'->>'start') AS period_start,
    parse_fhir_datetime(r.resource->'period'->>'end') AS period_end,
    -- Encounter.class.code — used by CMS165/CMS143 for inpatient/ED filtering (EMER, IMP, ACUTE, etc.)
    r.resource->'class'->>'code' AS class_code,
    -- Encounter.hospitalization.dischargeDisposition — used by shared_hospice
    r.resource->'hospitalization'->'dischargeDisposition'->'coding'->0->>'code' AS discharge_code
FROM encounter r;

-- ============================================================
-- Procedure
-- ============================================================
DROP VIEW IF EXISTS procedure_flat CASCADE;
CREATE VIEW procedure_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->'code'->'coding'->0->>'system' AS code_system,
    r.resource->'code'->'coding'->0->>'code' AS code,
    -- Aidbox polymorphic: performed -> {dateTime: '...'} or {Period: {start, end}}
    COALESCE(
        parse_fhir_datetime(r.resource->'performed'->>'dateTime'),
        parse_fhir_datetime(r.resource->'performed'->'Period'->>'start')
    ) AS performed_start,
    COALESCE(
        parse_fhir_datetime(r.resource->'performed'->>'dateTime'),
        parse_fhir_datetime(r.resource->'performed'->'Period'->>'end')
    ) AS performed_end
FROM procedure r;

-- ============================================================
-- Observation
-- ============================================================
DROP VIEW IF EXISTS observation_flat CASCADE;
CREATE VIEW observation_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->'code'->'coding'->0->>'system' AS code_system,
    r.resource->'code'->'coding'->0->>'code' AS code,
    r.resource->'category'->0->'coding'->0->>'code' AS category_code,
    -- Aidbox polymorphic: effective -> {dateTime: '...'} or {Period: {start, end}}
    COALESCE(
        parse_fhir_datetime(r.resource->'effective'->>'dateTime'),
        parse_fhir_datetime(r.resource->'effective'->'Period'->>'start')
    ) AS effective_start,
    COALESCE(
        parse_fhir_datetime(r.resource->'effective'->>'dateTime'),
        parse_fhir_datetime(r.resource->'effective'->'Period'->>'end')
    ) AS effective_end,
    -- Aidbox polymorphic: value -> {Quantity: {value, unit}} OR {CodeableConcept: {coding: [...]}}
    (r.resource->'value'->'Quantity'->>'value') AS value_quantity,
    (r.resource->'value'->'Quantity'->>'unit') AS value_unit,
    r.resource->'value'->'CodeableConcept'->'coding'->0->>'system' AS value_system,
    r.resource->'value'->'CodeableConcept'->'coding'->0->>'code' AS value_code,
    CASE WHEN r.resource->'value' IS NOT NULL THEN true ELSE false END AS has_value,
    parse_fhir_datetime(r.resource->>'issued') AS issued,
    -- qicore-notDoneReason extension (CMS143/CMS149 use it for denominator-exception logic)
    -- Aidbox edge: value.CodeableConcept.coding, Aidbox 2506: valueCodeableConcept.coding — support both
    (SELECT COALESCE(
        ext->'value'->'CodeableConcept'->'coding'->0->>'system',
        ext->'valueCodeableConcept'->'coding'->0->>'system')
     FROM jsonb_array_elements(r.resource->'extension') ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
     LIMIT 1) AS not_done_reason_system,
    (SELECT COALESCE(
        ext->'value'->'CodeableConcept'->'coding'->0->>'code',
        ext->'valueCodeableConcept'->'coding'->0->>'code')
     FROM jsonb_array_elements(r.resource->'extension') ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
     LIMIT 1) AS not_done_reason_code
FROM observation r;

-- ============================================================
-- Observation (BP panel, CMS165) — pre-filtered to LOINC 85354-9
-- with systolic (8480-6) and diastolic (8462-4) components projected
-- ============================================================
DROP VIEW IF EXISTS observation_bp_flat CASCADE;
CREATE VIEW observation_bp_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    COALESCE(
        parse_fhir_datetime(r.resource->'effective'->>'dateTime'),
        parse_fhir_datetime(r.resource->'effective'->'Period'->>'start')
    ) AS effective_date,
    r.resource->'encounter'->>'id' AS encounter_id,
    (SELECT (c->'value'->'Quantity'->>'value')::numeric
     FROM jsonb_array_elements(r.resource->'component') c
     WHERE c->'code'->'coding'->0->>'code' = '8480-6'
     LIMIT 1) AS systolic,
    (SELECT (c->'value'->'Quantity'->>'value')::numeric
     FROM jsonb_array_elements(r.resource->'component') c
     WHERE c->'code'->'coding'->0->>'code' = '8462-4'
     LIMIT 1) AS diastolic
FROM observation r
WHERE r.resource->'code'->'coding'->0->>'code' = '85354-9';

-- ============================================================
-- Condition
-- ============================================================
DROP VIEW IF EXISTS condition_flat CASCADE;
CREATE VIEW condition_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->'code'->'coding'->0->>'system' AS code_system,
    r.resource->'code'->'coding'->0->>'code' AS code,
    r.resource->'clinicalStatus'->'coding'->0->>'code' AS clinical_status,
    r.resource->'verificationStatus'->'coding'->0->>'code' AS verification_status,
    -- Aidbox polymorphic: onset -> {dateTime: '...'} or {Period: {start}}
    COALESCE(
        parse_fhir_datetime(r.resource->'onset'->>'dateTime'),
        parse_fhir_datetime(r.resource->'onset'->'Period'->>'start')
    ) AS onset_date,
    COALESCE(
        parse_fhir_datetime(r.resource->'abatement'->>'dateTime'),
        parse_fhir_datetime(r.resource->'abatement'->'Period'->>'end')
    ) AS abatement_date,
    r.resource->'category'->0->'coding'->0->>'code' AS category_code,
    -- Condition.bodySite — used by CMS125 for mastectomy laterality (24028007 Right, 7771000 Left)
    r.resource->'bodySite'->0->'coding'->0->>'code' AS body_site_code
FROM condition r;

-- ============================================================
-- ServiceRequest (for hospice exclusions)
-- ============================================================
DROP VIEW IF EXISTS servicerequest_flat CASCADE;
CREATE VIEW servicerequest_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->>'intent' AS intent,
    r.resource->'code'->'coding'->0->>'system' AS code_system,
    r.resource->'code'->'coding'->0->>'code' AS code,
    parse_fhir_datetime(r.resource->>'authoredOn') AS authored_on
FROM servicerequest r;

-- ============================================================
-- MedicationRequest (for dementia medications exclusion)
-- ============================================================
DROP VIEW IF EXISTS medicationrequest_flat CASCADE;
CREATE VIEW medicationrequest_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->>'intent' AS intent,
    -- Aidbox polymorphic: medication -> {CodeableConcept: {coding: [...]}} OR {Reference: {id: ...}}
    COALESCE(
        r.resource->'medication'->'CodeableConcept'->'coding'->0->>'system',
        m.resource->'code'->'coding'->0->>'system'
    ) AS med_system,
    COALESCE(
        r.resource->'medication'->'CodeableConcept'->'coding'->0->>'code',
        m.resource->'code'->'coding'->0->>'code'
    ) AS med_code,
    parse_fhir_datetime(r.resource->'dispenseRequest'->'validityPeriod'->>'start') AS validity_start,
    parse_fhir_datetime(r.resource->'dispenseRequest'->'validityPeriod'->>'end') AS validity_end,
    parse_fhir_datetime(r.resource->>'authoredOn') AS authored_on
FROM medicationrequest r
LEFT JOIN medication m ON m.id = r.resource->'medication'->'Reference'->>'id';

-- ============================================================
-- DeviceRequest (for frailty device exclusion)
-- ============================================================
DROP VIEW IF EXISTS devicerequest_flat CASCADE;
CREATE VIEW devicerequest_flat AS
SELECT
    r.id,
    r.resource->'subject'->>'id' AS patient_id,
    r.resource->>'status' AS status,
    r.resource->>'intent' AS intent,
    -- Aidbox polymorphic: code -> {CodeableConcept: {coding: [...]}}
    r.resource->'code'->'CodeableConcept'->'coding'->0->>'system' AS code_system,
    r.resource->'code'->'CodeableConcept'->'coding'->0->>'code' AS code,
    parse_fhir_datetime(r.resource->>'authoredOn') AS authored_on
FROM devicerequest r;
