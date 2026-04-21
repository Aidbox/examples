-- CMS130 Colorectal Cancer Screening — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS130FHIRColorectalCancerScrn v1.0.000
--
-- Result: 64/64 test cases match expected MeasureReports (100%)
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, cms130/sql/00-terminology-data.sql
-- IMPORTANT: Uses timestamptz for MP boundaries to handle Aidbox date storage

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 46-75 at end of MP AND qualifying encounter during MP
-- ============================================================
qualifying_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',  -- OfficeVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1240',  -- AnnualWellnessVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',  -- PreventiveCareServicesEstablishedOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',  -- PreventiveCareServicesInitialOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',  -- HomeHealthcareServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089',  -- VirtualEncounter
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080'  -- TelephoneVisits
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
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 46 AND 75
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS (6 paths, 20 sub-checks)
-- ============================================================

-- 3a. Malignant Neoplasm of Colon
malignant_neoplasm AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1001'  -- MalignantNeoplasmofColon
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
),

-- 3b. Total Colectomy
total_colectomy AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1019'  -- TotalColectomy
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_end <= mp.mp_end
),

-- 3c. Hospice Services (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3d. Palliative Care (shared function)
palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

-- 3e. Advanced Illness + Frailty (shared function, age >= 66)
advanced_illness_frailty AS (SELECT h.* FROM mp, LATERAL shared_advanced_illness_frailty(mp.mp_start, mp.mp_end) h),

-- 3f. Nursing Home (shared function, age >= 66)
nursing_home AS (SELECT h.* FROM mp, LATERAL shared_nursing_home(mp.mp_start, mp.mp_end) h),

-- 3g. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM malignant_neoplasm
    UNION SELECT patient_id FROM total_colectomy
    UNION SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM palliative
    UNION SELECT patient_id FROM advanced_illness_frailty
    UNION SELECT patient_id FROM nursing_home
),

-- ============================================================
-- 4. NUMERATOR — any qualifying screening
-- ============================================================

-- 4a. Colonoscopy (within 9 years before end of MP)
colonoscopy AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1020'  -- Colonoscopy
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_end >= (mp.mp_start - INTERVAL '9 years')
        AND pr.performed_end <= mp.mp_end
),

-- 4b. FOBT (during measurement period, must have value)
fobt AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1011'  -- FecalOccultBloodTest(FOBT)
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

-- 4c. sDNA FIT (within 2 years before end of MP, must have value)
sdna_fit AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1039'  -- sDNAFITTest
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= (mp.mp_start - INTERVAL '2 years')
        AND o.effective_start <= mp.mp_end
),

-- 4d. Flexible Sigmoidoscopy (within 4 years before end of MP)
flex_sig AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1010'  -- FlexibleSigmoidoscopy
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_end >= (mp.mp_start - INTERVAL '4 years')
        AND pr.performed_end <= mp.mp_end
),

-- 4e. CT Colonography (within 4 years before end of MP)
ct_colonography AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1038'  -- CTColonography
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= (mp.mp_start - INTERVAL '4 years')
        AND o.effective_start <= mp.mp_end
),

numerator AS (
    SELECT patient_id FROM colonoscopy
    UNION SELECT patient_id FROM fobt
    UNION SELECT patient_id FROM sdna_fit
    UNION SELECT patient_id FROM flex_sig
    UNION SELECT patient_id FROM ct_colonography
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
