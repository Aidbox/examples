-- CMS131 Diabetes Eye Exam — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS131FHIRDiabetesEyeExam v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, concepts table populated

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end,
        '2025-01-01T00:00:00Z'::timestamptz AS year_prior_start,
        '2025-12-31T23:59:59Z'::timestamptz AS year_prior_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 18-75, qualifying encounter during MP, diabetes diagnosis overlapping MP
-- ============================================================
qualifying_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c ON c.system = e.type_system AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1240',  -- AnnualWellnessVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',  -- PreventiveCareServicesEstablishedOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',  -- PreventiveCareServicesInitialOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1285', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080'  -- HomeHealthcareServices
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start AND e.period_start <= mp.mp_end
),

diabetes_diagnosis AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.103.12.1001'  -- Diabetes
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 18 AND 75
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
        AND p.id IN (SELECT patient_id FROM diabetes_diagnosis)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Hospice (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3b. Palliative Care (shared function)
palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

-- 3c. Advanced Illness + Frailty (shared function, age >= 66)
advanced_illness_frailty AS (SELECT h.* FROM mp, LATERAL shared_advanced_illness_frailty(mp.mp_start, mp.mp_end) h),

-- 3d. Nursing Home (shared function, age >= 66)
nursing_home AS (SELECT h.* FROM mp, LATERAL shared_nursing_home(mp.mp_start, mp.mp_end) h),

-- 3e. Bilateral Absence of Eyes (unique to CMS131)
bilateral_absence_eyes AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    CROSS JOIN mp
    WHERE c.code = '15665641000119103' AND c.code_system = 'http://snomed.info/sct'
        AND (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
),

-- 3f. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM palliative
    UNION SELECT patient_id FROM advanced_illness_frailty
    UNION SELECT patient_id FROM nursing_home
    UNION SELECT patient_id FROM bilateral_absence_eyes
),

-- ============================================================
-- 4. NUMERATOR — Bifurcated retinal exam logic
-- ============================================================

-- Diabetic Retinopathy condition overlapping MP
has_diabetic_retinopathy AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.327'  -- DiabeticRetinopathy
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

-- Retinal exam during MP (isPhysicalExamPerformed → category = 'exam')
retinal_exam_in_mp AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.115.12.1088'  -- RetinalOrDilatedEyeExam
    CROSS JOIN mp
    WHERE o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end
),

-- Retinal exam during MP or year prior
retinal_exam_in_mp_or_year_prior AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.115.12.1088'  -- RetinalOrDilatedEyeExam
    CROSS JOIN mp
    WHERE o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= (mp.mp_start - INTERVAL '1 year') AND o.effective_start <= mp.mp_end
),

-- Autonomous eye exam during MP (code=105914-6, value in AutonomousEyeExamResultOrFinding)
autonomous_eye_exam AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1004.2616'  -- AutonomousEyeExamResultOrFinding
    CROSS JOIN mp
    WHERE o.code = '105914-6' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end
),

-- Left eye retinopathy severity during MP (code=71490-7, value in DiabeticRetinopathySeverityLevel)
has_left_eye_retinopathy AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1266'  -- DiabeticRetinopathySeverityLevel
    CROSS JOIN mp
    WHERE o.code = '71490-7' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end
),

-- Right eye retinopathy severity during MP (code=71491-5, value in DiabeticRetinopathySeverityLevel)
has_right_eye_retinopathy AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1266'  -- DiabeticRetinopathySeverityLevel
    CROSS JOIN mp
    WHERE o.code = '71491-5' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end
),

-- Left eye NO retinopathy in year prior (code=71490-7, value ~ LA18643-9)
has_left_eye_no_retinopathy_prior AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '71490-7' AND o.code_system = 'http://loinc.org'
        AND o.value_code = 'LA18643-9'
        AND o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.year_prior_start AND o.effective_start <= mp.year_prior_end
),

-- Right eye NO retinopathy in year prior (code=71491-5, value ~ LA18643-9)
has_right_eye_no_retinopathy_prior AS (
    SELECT DISTINCT o.patient_id FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '71491-5' AND o.code_system = 'http://loinc.org'
        AND o.value_code = 'LA18643-9'
        AND o.status IN ('final','amended','corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.year_prior_start AND o.effective_start <= mp.year_prior_end
),

-- Path 4: Retinal exam finding with retinopathy severity level
retinopathy_severity_finding AS (
    -- Left AND Right retinopathy
    (SELECT patient_id FROM has_left_eye_retinopathy INTERSECT SELECT patient_id FROM has_right_eye_retinopathy)
    UNION
    -- Left retinopathy AND Right no retinopathy in year prior
    (SELECT patient_id FROM has_left_eye_retinopathy INTERSECT SELECT patient_id FROM has_right_eye_no_retinopathy_prior)
    UNION
    -- Right retinopathy AND Left no retinopathy in year prior
    (SELECT patient_id FROM has_right_eye_retinopathy INTERSECT SELECT patient_id FROM has_left_eye_no_retinopathy_prior)
),

-- Path 5: Both eyes no retinopathy in year prior
no_retinopathy_finding_prior AS (
    SELECT patient_id FROM has_left_eye_no_retinopathy_prior
    INTERSECT
    SELECT patient_id FROM has_right_eye_no_retinopathy_prior
),

-- Combined numerator: 5 paths
numerator AS (
    -- Path 1: retinopathy + retinal exam in MP
    (SELECT patient_id FROM has_diabetic_retinopathy INTERSECT SELECT patient_id FROM retinal_exam_in_mp)
    UNION
    -- Path 2: no retinopathy + retinal exam in MP or year prior
    (SELECT patient_id FROM retinal_exam_in_mp_or_year_prior EXCEPT SELECT patient_id FROM has_diabetic_retinopathy)
    UNION
    -- Path 3: autonomous eye exam
    SELECT patient_id FROM autonomous_eye_exam
    UNION
    -- Path 4: retinopathy severity finding
    SELECT patient_id FROM retinopathy_severity_finding
    UNION
    -- Path 5: no retinopathy finding in year prior
    SELECT patient_id FROM no_retinopathy_finding_prior
),

-- ============================================================
-- 5. MEASURE REPORT
-- ============================================================
measure_results AS (
    SELECT
        p.patient_id,
        1 AS in_initial_population,
        1 AS in_denominator,
        CASE WHEN de.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_exclusion,
        CASE WHEN de.patient_id IS NULL AND n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator
    FROM initial_population p
    LEFT JOIN denominator_exclusion de ON de.patient_id = p.patient_id
    LEFT JOIN numerator n ON n.patient_id = p.patient_id
)

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
