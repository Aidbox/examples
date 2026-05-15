-- Shared Exclusion Functions
-- Reusable SQL functions for exclusion blocks shared across multiple measures.
--
-- Each function accepts an optional p_subject (DEFAULT NULL):
-- when set, the filter is pushed early via ix_*_subject indexes.
--
-- Usage in measure SQL (LATERAL pattern):
--   hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),
--   palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),
--
-- With push-down for a specific patient:
--   hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end, $subject) h),
--
-- Prerequisites: shared/sql/01-views.sql (flat views must exist)

-- ============================================================
-- Drop existing functions in reverse-dependency order.
-- shared_advanced_illness_frailty depends on the other three (frailty/illness/dementia),
-- so it must be dropped first.
-- ============================================================
DROP FUNCTION IF EXISTS shared_advanced_illness_frailty(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_hospice(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_palliative(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_has_frailty(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_advanced_illness(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_dementia_meds(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS shared_nursing_home(timestamptz, timestamptz);

-- ============================================================
-- HOSPICE (6 sub-checks) — used by 9 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_hospice(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
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
        AND (p_subject IS NULL OR e.patient_id = p_subject)
    UNION ALL
    -- Hospice encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1003'  -- HospiceEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
        AND (p_subject IS NULL OR e.patient_id = p_subject)
    UNION ALL
    -- Hospice observation (LOINC 45755-6 = yes)
    SELECT o.patient_id
    FROM observation_flat o
    WHERE o.code = '45755-6' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
        AND (p_subject IS NULL OR o.patient_id = p_subject)
    UNION ALL
    -- Hospice order (ServiceRequest)
    SELECT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'  -- HospiceCareAmbulatory
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= p_mp_start AND sr.authored_on <= p_mp_end
        AND (p_subject IS NULL OR sr.patient_id = p_subject)
    UNION ALL
    -- Hospice procedure
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'  -- HospiceCareAmbulatory
    WHERE pr.status = 'completed'
        AND pr.performed_start <= p_mp_end
        AND (pr.performed_end IS NULL OR pr.performed_end >= p_mp_start)
        AND (p_subject IS NULL OR pr.patient_id = p_subject)
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
        AND (p_subject IS NULL OR c.patient_id = p_subject)
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- PALLIATIVE CARE (4 sub-checks) — used by 5 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_palliative(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
  SELECT DISTINCT patient_id FROM (
    -- Palliative observation (LOINC 71007-9)
    SELECT o.patient_id
    FROM observation_flat o
    WHERE o.code = '71007-9' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
        AND (p_subject IS NULL OR o.patient_id = p_subject)
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
        AND (p_subject IS NULL OR c.patient_id = p_subject)
    UNION ALL
    -- Palliative encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1090'  -- PalliativeCareEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
        AND (p_subject IS NULL OR e.patient_id = p_subject)
    UNION ALL
    -- Palliative procedure
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1135'  -- PalliativeCareIntervention
    WHERE pr.status = 'completed'
        AND pr.performed_start <= p_mp_end
        AND (pr.performed_end IS NULL OR pr.performed_end >= p_mp_start)
        AND (p_subject IS NULL OR pr.patient_id = p_subject)
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- FRAILTY INDICATORS (5 sub-checks) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_has_frailty(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
  SELECT DISTINCT patient_id FROM (
    -- Frailty Device (DeviceRequest)
    SELECT dr.patient_id
    FROM devicerequest_flat dr
    JOIN concepts vs ON vs.system = dr.code_system AND vs.code = dr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'  -- FrailtyDevice
    WHERE dr.status IN ('active', 'completed')
        AND dr.authored_on >= p_mp_start AND dr.authored_on <= p_mp_end
        AND (p_subject IS NULL OR dr.patient_id = p_subject)
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
        AND (p_subject IS NULL OR c.patient_id = p_subject)
    UNION ALL
    -- Frailty Encounter
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1088'  -- FrailtyEncounter
    WHERE e.status = 'finished'
        AND e.period_start <= p_mp_end
        AND (e.period_end IS NULL OR e.period_end >= p_mp_start)
        AND (p_subject IS NULL OR e.patient_id = p_subject)
    UNION ALL
    -- Frailty Symptom
    SELECT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1075'  -- FrailtySymptom
    WHERE o.status IN ('preliminary', 'final', 'amended', 'corrected')
        AND o.effective_start <= p_mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= p_mp_start)
        AND (p_subject IS NULL OR o.patient_id = p_subject)
    UNION ALL
    -- Frailty via Medical Equipment (ObservationScreeningAssessment)
    SELECT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'  -- FrailtyDevice
    WHERE o.code = '98181-1' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_end >= p_mp_start AND o.effective_end <= p_mp_end
        AND (p_subject IS NULL OR o.patient_id = p_subject)
  ) sub
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ADVANCED ILLNESS (condition within MP-1yr to MP end) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_advanced_illness(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082'  -- AdvancedIllness
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date >= (p_mp_start - INTERVAL '1 year')
        AND c.onset_date <= p_mp_end
        AND (p_subject IS NULL OR c.patient_id = p_subject)
$$ LANGUAGE sql STABLE;

-- ============================================================
-- DEMENTIA MEDICATIONS (active, overlapping MP-1yr to MP end) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_dementia_meds(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
    SELECT mr.patient_id
    FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1510'  -- DementiaMedications
    WHERE mr.status = 'active'
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND COALESCE(mr.validity_start, mr.authored_on) <= p_mp_end
        AND COALESCE(mr.validity_end, mr.authored_on) >= (p_mp_start - INTERVAL '1 year')
        AND (p_subject IS NULL OR mr.patient_id = p_subject)
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ADVANCED ILLNESS + FRAILTY combined (standard: age >= 66) — used by CMS125, 130, 131
-- CMS165 uses its own variant with age 66-80 / >=81 split
-- ============================================================
CREATE OR REPLACE FUNCTION shared_advanced_illness_frailty(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
    SELECT p.id AS patient_id
    FROM patient_flat p
    JOIN shared_has_frailty(p_mp_start, p_mp_end, p_subject) f ON f.patient_id = p.id
    LEFT JOIN shared_advanced_illness(p_mp_start, p_mp_end, p_subject) ai ON ai.patient_id = p.id
    LEFT JOIN shared_dementia_meds(p_mp_start, p_mp_end, p_subject) dm ON dm.patient_id = p.id
    WHERE EXTRACT(YEAR FROM AGE(p_mp_end, p.birth_date::date)) >= 66
        AND (ai.patient_id IS NOT NULL OR dm.patient_id IS NOT NULL)
        AND (p_subject IS NULL OR p.id = p_subject)
$$ LANGUAGE sql STABLE;

-- ============================================================
-- NURSING HOME (age >= 66, housing status = lives in nursing home) — used by 4 measures
-- ============================================================
CREATE OR REPLACE FUNCTION shared_nursing_home(
    p_mp_start timestamptz,
    p_mp_end timestamptz,
    p_subject text DEFAULT NULL
)
RETURNS TABLE(patient_id text) AS $$
    SELECT o.patient_id
    FROM observation_flat o
    JOIN patient_flat p ON p.id = o.patient_id
    WHERE EXTRACT(YEAR FROM AGE(p_mp_end, p.birth_date::date)) >= 66
        AND o.code = '71802-3' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '160734000'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_end <= p_mp_end
        AND (p_subject IS NULL OR o.patient_id = p_subject)
$$ LANGUAGE sql STABLE;

-- ============================================================
-- CMS165 aggregate wrapper
-- PL/pgSQL wrapper that sets enable_nestloop = off before running
-- the CMS165 aggregate query.  On the legacy path (JSONB views)
-- the PG planner mis-estimates CTE cardinality by 15,000x and
-- picks nested-loop joins that take 75 s at 100 K patients.
-- SET LOCAL inside this function forces hash joins → 7 s.
-- ============================================================
DROP FUNCTION IF EXISTS cms165_aggregate(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION cms165_aggregate(
    p_start timestamptz,
    p_end   timestamptz
)
RETURNS TABLE (
    initial_population        bigint,
    denominator               bigint,
    denominator_exclusion     bigint,
    numerator                 bigint,
    denominator_minus_exclusion bigint,
    measure_score             numeric
) AS $$
BEGIN
    SET LOCAL enable_nestloop = off;

    RETURN QUERY
    WITH mp AS (
        SELECT
            p_start  AS mp_start,
            p_end    AS mp_end,
            p_start + interval '6 months' AS mp_6mo
    ),

    qualifying_encounters AS (
        SELECT DISTINCT e.patient_id
        FROM encounter_flat e
        JOIN concepts c ON c.system = e.type_system AND c.code = e.type_code
            AND c.valueset_url IN (
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1240',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080'
            )
        CROSS JOIN mp
        WHERE e.status = 'finished'
            AND e.period_start >= mp.mp_start AND e.period_start <= mp.mp_end
    ),

    essential_hypertension AS (
        SELECT DISTINCT c.patient_id
        FROM condition_flat c
        JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.104.12.1011'
        CROSS JOIN mp
        WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
            AND c.onset_date < mp.mp_6mo
            AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
    ),

    initial_pop AS (
        SELECT p.id AS patient_id
        FROM patient_flat p
        CROSS JOIN mp
        WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 18 AND 85
            AND p.id IN (SELECT patient_id FROM qualifying_encounters)
            AND p.id IN (SELECT patient_id FROM essential_hypertension)
    ),

    hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

    pregnancy_renal AS (
        SELECT DISTINCT c.patient_id FROM condition_flat c
        JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
            AND vs.valueset_url IN (
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.353',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1029',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1002'
            )
        CROSS JOIN mp
        WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
            AND c.onset_date <= mp.mp_end
            AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
    ),

    esrd_procedures AS (
        SELECT DISTINCT pr.patient_id FROM procedure_flat pr
        JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
            AND vs.valueset_url IN (
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1012',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1013'
            )
        CROSS JOIN mp
        WHERE pr.status = 'completed'
            AND pr.performed_end <= mp.mp_end
    ),

    esrd_encounter AS (
        SELECT DISTINCT e.patient_id FROM encounter_flat e
        JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1014'
        CROSS JOIN mp
        WHERE e.status = 'finished' AND e.period_start <= mp.mp_end
    ),

    palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

    patients_66_plus AS (
        SELECT p.id AS patient_id, EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) AS age
        FROM patient_flat p CROSS JOIN mp
        WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) >= 66
    ),
    has_frailty AS (SELECT h.* FROM mp, LATERAL shared_has_frailty(mp.mp_start, mp.mp_end) h),
    advanced_illness AS (SELECT h.* FROM mp, LATERAL shared_advanced_illness(mp.mp_start, mp.mp_end) h),
    dementia_meds AS (SELECT h.* FROM mp, LATERAL shared_dementia_meds(mp.mp_start, mp.mp_end) h),
    advanced_illness_frailty AS (
        SELECT p66.patient_id FROM patients_66_plus p66
        JOIN has_frailty f ON f.patient_id = p66.patient_id
        LEFT JOIN advanced_illness ai ON ai.patient_id = p66.patient_id
        LEFT JOIN dementia_meds dm ON dm.patient_id = p66.patient_id
        WHERE p66.age BETWEEN 66 AND 80
            AND (ai.patient_id IS NOT NULL OR dm.patient_id IS NOT NULL)
        UNION
        SELECT p66.patient_id FROM patients_66_plus p66
        JOIN has_frailty f ON f.patient_id = p66.patient_id
        WHERE p66.age >= 81
    ),

    nursing_home AS (SELECT h.* FROM mp, LATERAL shared_nursing_home(mp.mp_start, mp.mp_end) h),

    den_excl AS (
        SELECT patient_id FROM hospice
        UNION SELECT patient_id FROM pregnancy_renal
        UNION SELECT patient_id FROM esrd_procedures
        UNION SELECT patient_id FROM esrd_encounter
        UNION SELECT patient_id FROM palliative
        UNION SELECT patient_id FROM advanced_illness_frailty
        UNION SELECT patient_id FROM nursing_home
    ),

    bp_observations AS (
        SELECT o.patient_id, o.id AS obs_id, o.effective_date, o.encounter_id,
               o.systolic, o.diastolic
        FROM observation_bp_flat o
        CROSS JOIN mp
        WHERE o.status IN ('final', 'amended', 'corrected')
            AND o.effective_date >= mp.mp_start
            AND o.effective_date <= mp.mp_end
    ),

    disqualifying_encounters AS (
        SELECT e.id AS encounter_id, e.patient_id, e.period_start, e.period_end
        FROM encounter_flat e
        JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
            AND vs.valueset_url IN (
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.666.5.307',
                'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1010'
            )
        WHERE e.status = 'finished'
        UNION
        SELECT e.id, e.patient_id, e.period_start, e.period_end
        FROM encounter_flat e
        WHERE e.status = 'finished'
            AND e.class_code IN ('EMER', 'IMP', 'ACUTE', 'NONAC', 'PRENC', 'SS')
    ),

    qualifying_bp AS (
        SELECT bp.*
        FROM bp_observations bp
        WHERE NOT EXISTS (
            SELECT 1 FROM disqualifying_encounters de WHERE de.encounter_id = bp.encounter_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM disqualifying_encounters de
            WHERE de.patient_id = bp.patient_id
                AND bp.effective_date::date >= de.period_start::date
                AND bp.effective_date::date <= de.period_end::date
        )
    ),

    most_recent_bp_day AS (
        SELECT patient_id, MAX(effective_date::date) AS bp_date
        FROM qualifying_bp
        GROUP BY patient_id
    ),

    bp_on_most_recent_day AS (
        SELECT qbp.patient_id,
               MIN(qbp.systolic) AS lowest_systolic,
               MIN(qbp.diastolic) AS lowest_diastolic
        FROM qualifying_bp qbp
        JOIN most_recent_bp_day mrd ON mrd.patient_id = qbp.patient_id
            AND qbp.effective_date::date = mrd.bp_date
        GROUP BY qbp.patient_id
    ),

    num AS (
        SELECT patient_id
        FROM bp_on_most_recent_day
        WHERE lowest_systolic < 140 AND lowest_diastolic < 90
    ),

    measure_results AS (
        SELECT
            p.patient_id,
            1 AS in_initial_population,
            1 AS in_denominator,
            CASE WHEN de.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_exclusion,
            CASE WHEN de.patient_id IS NULL AND n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator
        FROM initial_pop p
        LEFT JOIN den_excl de ON de.patient_id = p.patient_id
        LEFT JOIN num n ON n.patient_id = p.patient_id
    )

    SELECT
        COUNT(*)::bigint,
        COUNT(*)::bigint,
        SUM(in_exclusion)::bigint,
        SUM(in_numerator)::bigint,
        (COUNT(*) - SUM(in_exclusion))::bigint,
        CASE
            WHEN COUNT(*) - SUM(in_exclusion) > 0
            THEN ROUND(SUM(in_numerator)::numeric / (COUNT(*) - SUM(in_exclusion)), 4)
            ELSE 0
        END
    FROM measure_results;
END;
$$ LANGUAGE plpgsql;
