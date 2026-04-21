-- CMS125 Breast Cancer Screening — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS125FHIRBreastCancerScreen v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, concepts table populated

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end,
        '2024-10-01T00:00:00Z'::timestamptz AS mammogram_lookback_start
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 42-74, female, qualifying encounter during MP
-- ============================================================
qualifying_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c ON c.system = e.type_system AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1240',  -- AnnualWellnessVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',  -- PreventiveCareServicesEstablishedOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',  -- PreventiveCareServicesInitialOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080'  -- HomeHealthcareServices
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start AND e.period_start <= mp.mp_end
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 42 AND 74
        AND p.gender = 'female'
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Hospice (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3b. Bilateral Mastectomy (diagnosis or procedure)
bilateral_mastectomy_dx AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1068'  -- Historyofbilateralmastectomy
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
),
bilateral_mastectomy_proc AS (
    SELECT DISTINCT pr.patient_id FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1005'  -- BilateralMastectomy
    CROSS JOIN mp WHERE pr.status = 'completed' AND pr.performed_end <= mp.mp_end
),

-- 3c. Right Mastectomy (diagnosis or procedure)
right_mastectomy_dx AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1070'  -- StatusPostRightMastectomy
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
    UNION
    -- Unilateral unspecified with bodySite = Right (24028007)
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1071'  -- UnilateralMastectomy,UnspecifiedLaterality
    JOIN condition r ON r.id = c.id
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
        AND r.resource->'bodySite'->0->'coding'->0->>'code' = '24028007'
),
right_mastectomy_proc AS (
    SELECT DISTINCT pr.patient_id FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1134'  -- UnilateralMastectomyRight
    CROSS JOIN mp WHERE pr.status = 'completed' AND pr.performed_end <= mp.mp_end
),
has_right_mastectomy AS (
    SELECT patient_id FROM right_mastectomy_dx UNION SELECT patient_id FROM right_mastectomy_proc
),

-- 3d. Left Mastectomy (diagnosis or procedure)
left_mastectomy_dx AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1069'  -- StatusPostLeftMastectomy
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
    UNION
    -- Unilateral unspecified with bodySite = Left (7771000)
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1071'  -- UnilateralMastectomy,UnspecifiedLaterality
    JOIN condition r ON r.id = c.id
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
        AND r.resource->'bodySite'->0->'coding'->0->>'code' = '7771000'
),
left_mastectomy_proc AS (
    SELECT DISTINCT pr.patient_id FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1133'  -- UnilateralMastectomyLeft
    CROSS JOIN mp WHERE pr.status = 'completed' AND pr.performed_end <= mp.mp_end
),
has_left_mastectomy AS (
    SELECT patient_id FROM left_mastectomy_dx UNION SELECT patient_id FROM left_mastectomy_proc
),

-- 3e. Combined bilateral: (right AND left) OR bilateral
mastectomy_exclusion AS (
    SELECT patient_id FROM bilateral_mastectomy_dx
    UNION SELECT patient_id FROM bilateral_mastectomy_proc
    UNION (SELECT patient_id FROM has_right_mastectomy INTERSECT SELECT patient_id FROM has_left_mastectomy)
),

-- 3f. Palliative Care (shared function)
palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

-- 3g. Advanced Illness + Frailty (shared function, age >= 66)
advanced_illness_frailty AS (SELECT h.* FROM mp, LATERAL shared_advanced_illness_frailty(mp.mp_start, mp.mp_end) h),

-- 3h. Nursing Home (shared function, age >= 66)
nursing_home AS (SELECT h.* FROM mp, LATERAL shared_nursing_home(mp.mp_start, mp.mp_end) h),

-- 3i. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM mastectomy_exclusion
    UNION SELECT patient_id FROM palliative
    UNION SELECT patient_id FROM advanced_illness_frailty
    UNION SELECT patient_id FROM nursing_home
),

-- ============================================================
-- 4. NUMERATOR — Mammography
-- Lookback: October 1 two years prior to MP start through end of MP
-- ============================================================
numerator AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1018'  -- Mammography
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'imaging'
        AND o.effective_end >= mp.mammogram_lookback_start
        AND o.effective_end <= mp.mp_end
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
