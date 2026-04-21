-- Shared ViewDefinitions
-- Flattened projections of FHIR resources for SQL-based measure calculation
-- Reusable across all measures (CMS130, CMS125, CMS131, CMS165, etc.)
--
-- IMPORTANT: Uses Aidbox JSONB storage format:
--   - subject reference: resource->'subject'->>'id' (not resource->'subject'->>'reference')
--   - polymorphic fields: resource->'performed'->'dateTime' (not resource->>'performedDateTime')
--   - polymorphic fields: resource->'performed'->'Period'->>'start' (not resource->'performedPeriod'->>'start')

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
    (SELECT ext->'value'->>'code'
     FROM jsonb_array_elements(r.resource->'extension') ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex'
     LIMIT 1) AS sex,
    -- us-core-race extension: ombCategory code (e.g. 1002-5 = American Indian, 2054-5 = Black, 2106-3 = White, 2028-9 = Asian)
    -- Aidbox polymorphic: value.Coding.code (not value.code)
    (SELECT COALESCE(sub_ext->'value'->'Coding'->>'code', sub_ext->'value'->>'code')
     FROM jsonb_array_elements(r.resource->'extension') ext,
          LATERAL jsonb_array_elements(ext->'extension') sub_ext
     WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
       AND sub_ext->>'url' = 'ombCategory'
     LIMIT 1) AS race_code,
    -- us-core-ethnicity extension: ombCategory code (e.g. 2135-2 = Hispanic, 2186-5 = Non-Hispanic)
    (SELECT COALESCE(sub_ext->'value'->'Coding'->>'code', sub_ext->'value'->>'code')
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
    (r.resource->'period'->>'start')::timestamptz AS period_start,
    (r.resource->'period'->>'end')::timestamptz AS period_end
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
        (r.resource->'performed'->>'dateTime')::timestamptz,
        (r.resource->'performed'->'Period'->>'start')::timestamptz
    ) AS performed_start,
    COALESCE(
        (r.resource->'performed'->>'dateTime')::timestamptz,
        (r.resource->'performed'->'Period'->>'end')::timestamptz
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
        (r.resource->'effective'->>'dateTime')::timestamptz,
        (r.resource->'effective'->'Period'->>'start')::timestamptz
    ) AS effective_start,
    COALESCE(
        (r.resource->'effective'->>'dateTime')::timestamptz,
        (r.resource->'effective'->'Period'->>'end')::timestamptz
    ) AS effective_end,
    -- Aidbox polymorphic: value -> {CodeableConcept: {coding: [...]}}
    r.resource->'value'->'CodeableConcept'->'coding'->0->>'system' AS value_system,
    r.resource->'value'->'CodeableConcept'->'coding'->0->>'code' AS value_code,
    CASE WHEN r.resource->'value' IS NOT NULL THEN true ELSE false END AS has_value
FROM observation r;

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
        (r.resource->'onset'->>'dateTime')::timestamptz,
        (r.resource->'onset'->'Period'->>'start')::timestamptz
    ) AS onset_date,
    COALESCE(
        (r.resource->'abatement'->>'dateTime')::timestamptz,
        (r.resource->'abatement'->'Period'->>'end')::timestamptz
    ) AS abatement_date,
    r.resource->'category'->0->'coding'->0->>'code' AS category_code
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
    (r.resource->>'authoredOn')::timestamptz AS authored_on
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
    (r.resource->'dispenseRequest'->'validityPeriod'->>'start')::timestamptz AS validity_start,
    (r.resource->'dispenseRequest'->'validityPeriod'->>'end')::timestamptz AS validity_end,
    (r.resource->>'authoredOn')::timestamptz AS authored_on
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
    (r.resource->>'authoredOn')::timestamptz AS authored_on
FROM devicerequest r;
