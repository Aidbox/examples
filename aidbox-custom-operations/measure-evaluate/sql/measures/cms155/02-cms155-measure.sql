-- CMS155 Weight Assessment and Counseling for Children/Adolescents — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS155FHIRWgtAssessCounseling v1.0.000
--
-- Multi-numerator measure (3 groups, same IP/Den/Exc):
--   Numerator 1: BMI percentile + Height + Weight during MP
--   Numerator 2: Counseling for Nutrition during MP
--   Numerator 3: Counseling for Physical Activity during MP
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 3-17 at end of MP AND qualifying encounter during MP
-- ============================================================
qualifying_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',  -- OfficeVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1026',  -- PreventiveCareServicesIndividualCounseling
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1024',  -- PreventiveCareEstablishedOfficeVisit0to17
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1022',  -- PreventiveCareServicesInitialOfficeVisit0to17
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1027',  -- PreventiveCareServicesGroupCounseling
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',  -- HomeHealthcareServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080'   -- TelephoneVisits
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start
        AND e.period_start <= mp.mp_end
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 3 AND 17
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Hospice Services (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3b. Pregnancy Diagnosis overlapping MP
pregnancy_exclusion AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378'  -- Pregnancy
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

-- 3c. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM pregnancy_exclusion
),

-- ============================================================
-- 4. NUMERATORS
-- ============================================================

-- 4a. Numerator 1: BMI Percentile + Height + Weight during MP
-- BMI Percentile (LOINC 59576-9, pediatric-bmi-for-age profile)
has_bmi_percentile AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '59576-9' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

-- Height (LOINC 8302-2, us-core-body-height profile)
has_height AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '8302-2' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

-- Weight (LOINC 29463-7, us-core-body-weight profile)
has_weight AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '29463-7' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

-- Numerator 1 = all three present
numerator AS (
    SELECT patient_id FROM has_bmi_percentile
    INTERSECT SELECT patient_id FROM has_height
    INTERSECT SELECT patient_id FROM has_weight
),

-- 4b. Numerator 2: Counseling for Nutrition during MP
numerator_2 AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.195.12.1003'  -- CounselingForNutrition
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start >= mp.mp_start
        AND pr.performed_start <= mp.mp_end
),

-- 4c. Numerator 3: Counseling for Physical Activity during MP
numerator_3 AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1035'  -- CounselingForPhysicalActivity
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start >= mp.mp_start
        AND pr.performed_start <= mp.mp_end
),

-- ============================================================
-- 5. MEASURE REPORT (3 groups — shared IP/Den/Exc, different numerators)
-- ============================================================
measure_results AS (
    SELECT
        p.patient_id,
        1 AS in_initial_population,
        1 AS in_denominator,
        CASE WHEN de.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_exclusion,
        CASE WHEN de.patient_id IS NULL AND n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator,
        CASE WHEN de.patient_id IS NULL AND n2.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator_2,
        CASE WHEN de.patient_id IS NULL AND n3.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator_3
    FROM initial_population p
    LEFT JOIN denominator_exclusion de ON de.patient_id = p.patient_id
    LEFT JOIN numerator n ON n.patient_id = p.patient_id
    LEFT JOIN numerator_2 n2 ON n2.patient_id = p.patient_id
    LEFT JOIN numerator_3 n3 ON n3.patient_id = p.patient_id
)

-- ============================================================
-- OUTPUT: Summary MeasureReport
-- ============================================================
SELECT
    COUNT(*) AS initial_population,
    COUNT(*) AS denominator,
    SUM(in_exclusion) AS denominator_exclusion,
    SUM(in_numerator) AS numerator,
    COUNT(*) - SUM(in_exclusion) AS denominator_minus_exclusion,
    CASE
        WHEN COUNT(*) - SUM(in_exclusion) > 0
        THEN ROUND(SUM(in_numerator)::numeric / (COUNT(*) - SUM(in_exclusion)), 4)
        ELSE 0
    END AS measure_score
FROM measure_results;
