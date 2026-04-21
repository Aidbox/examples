-- Shared Exclusion Functions
-- Reusable SQL functions for exclusion blocks shared across multiple measures.
-- Eliminates ~100 lines of copy-paste per measure.
--
-- Usage in measure SQL (LATERAL pattern):
--   hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),
--   palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),
--   ...
--
-- Prerequisites: shared/sql/01-views.sql (flat views must exist)

-- ============================================================
-- HOSPICE (6 sub-checks) — used by 9 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_hospice(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
  SELECT DISTINCT patient_id FROM (
    -- Inpatient discharge to hospice
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN encounter r ON r.id = e.id
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.666.5.307'  -- EncounterInpatient
    WHERE e.status = 'finished'
        AND e.period_end <= p_mp_end AND e.period_end >= p_mp_start
        AND (r.resource->'hospitalization'->'dischargeDisposition'->'coding'->0->>'code'
            IN ('428361000124107', '428371000124100'))
    UNION ALL
    -- Hospice encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1003'  -- HospiceEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
    UNION ALL
    -- Hospice observation (LOINC 45755-6 = yes)
    SELECT o.patient_id
    FROM observation_flat o
    WHERE o.code = '45755-6' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
    UNION ALL
    -- Hospice order (ServiceRequest)
    SELECT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'  -- HospiceCareAmbulatory
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= p_mp_start AND sr.authored_on <= p_mp_end
    UNION ALL
    -- Hospice procedure
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'  -- HospiceCareAmbulatory
    WHERE pr.status = 'completed'
        AND pr.performed_start <= p_mp_end
        AND (pr.performed_end IS NULL OR pr.performed_end >= p_mp_start)
    UNION ALL
    -- Hospice diagnosis
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1165'  -- HospiceDiagnosis
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= p_mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= p_mp_start)
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- PALLIATIVE CARE (4 sub-checks) — used by 5 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_palliative(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
  SELECT DISTINCT patient_id FROM (
    -- Palliative observation (LOINC 71007-9)
    SELECT o.patient_id
    FROM observation_flat o
    WHERE o.code = '71007-9' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
    UNION ALL
    -- Palliative diagnosis
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1167'  -- PalliativeCareDiagnosis
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= p_mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= p_mp_start)
    UNION ALL
    -- Palliative encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1090'  -- PalliativeCareEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
    UNION ALL
    -- Palliative procedure
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1135'  -- PalliativeCareIntervention
    WHERE pr.status = 'completed'
        AND pr.performed_start <= p_mp_end
        AND (pr.performed_end IS NULL OR pr.performed_end >= p_mp_start)
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- FRAILTY INDICATORS (5 sub-checks) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_has_frailty(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
  SELECT DISTINCT patient_id FROM (
    -- Frailty Device (DeviceRequest)
    SELECT dr.patient_id
    FROM devicerequest_flat dr
    JOIN concepts vs ON vs.system = dr.code_system AND vs.code = dr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'  -- FrailtyDevice
    WHERE dr.status IN ('active', 'completed')
        AND dr.authored_on >= p_mp_start AND dr.authored_on <= p_mp_end
    UNION ALL
    -- Frailty Diagnosis
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1074'  -- FrailtyDiagnosis
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= p_mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= p_mp_start)
    UNION ALL
    -- Frailty Encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1088'  -- FrailtyEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
    UNION ALL
    -- Frailty Symptom
    SELECT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1075'  -- FrailtySymptom
    WHERE o.status IN ('preliminary', 'final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
    UNION ALL
    -- Frailty via Medical Equipment (ObservationScreeningAssessment)
    SELECT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'  -- FrailtyDevice
    WHERE o.code = '98181-1' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_end >= p_mp_start AND o.effective_end <= p_mp_end
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ADVANCED ILLNESS (condition within MP-1yr to MP end) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_advanced_illness(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082'  -- AdvancedIllness
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date >= (p_mp_start - INTERVAL '1 year')
        AND c.onset_date <= p_mp_end
$$ LANGUAGE sql STABLE;

-- ============================================================
-- DEMENTIA MEDICATIONS (active, overlapping MP-1yr to MP end) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_dementia_meds(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
    SELECT mr.patient_id
    FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1510'  -- DementiaMedications
    WHERE mr.status = 'active'
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND COALESCE(mr.validity_start, mr.authored_on) <= p_mp_end
        AND COALESCE(mr.validity_end, mr.authored_on) >= (p_mp_start - INTERVAL '1 year')
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ADVANCED ILLNESS + FRAILTY combined (standard: age >= 66) — used by CMS125, 130, 131
-- CMS165 uses its own variant with age 66-80 / >=81 split
-- ============================================================
CREATE OR REPLACE FUNCTION shared_advanced_illness_frailty(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
    SELECT p.id AS patient_id
    FROM patient_flat p
    JOIN shared_has_frailty(p_mp_start, p_mp_end) f ON f.patient_id = p.id
    LEFT JOIN shared_advanced_illness(p_mp_start, p_mp_end) ai ON ai.patient_id = p.id
    LEFT JOIN shared_dementia_meds(p_mp_start, p_mp_end) dm ON dm.patient_id = p.id
    WHERE EXTRACT(YEAR FROM AGE(p_mp_end, p.birth_date::date)) >= 66
        AND (ai.patient_id IS NOT NULL OR dm.patient_id IS NOT NULL)
$$ LANGUAGE sql STABLE;

-- ============================================================
-- NURSING HOME (age >= 66, housing status = lives in nursing home) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_nursing_home(p_mp_start timestamptz, p_mp_end timestamptz)
RETURNS TABLE(patient_id text) AS $$
    SELECT o.patient_id
    FROM observation_flat o
    JOIN patient_flat p ON p.id = o.patient_id
    WHERE EXTRACT(YEAR FROM AGE(p_mp_end, p.birth_date::date)) >= 66
        AND o.code = '71802-3' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '160734000'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_end <= p_mp_end
$$ LANGUAGE sql STABLE;
