-- CMS124 Cervical Cancer Screening — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS124FHIRCervicalCancerScreen v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, cms124 terminology data
-- IMPORTANT: Uses timestamptz for MP boundaries to handle Aidbox date storage

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 24-64 at end of MP, sex = 248152002 (Female), qualifying encounter during MP
-- ============================================================
qualifying_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',  -- OfficeVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',  -- PreventiveCareServicesEstablishedOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',  -- PreventiveCareServicesInitialOfficeVisit18AndUp
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',  -- HomeHealthcareServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080',  -- TelephoneVisits
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089'   -- VirtualEncounter
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
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 24 AND 64
        AND p.sex = '248152002'
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Absence of Cervix (measure-specific)
-- Procedure: Hysterectomy with No Residual Cervix, performed ends on or before end of MP
absence_of_cervix_procedure AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1014'  -- HysterectomyWithNoResidualCervix
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_end <= mp.mp_end
),

-- Condition: Congenital or Acquired Absence of Cervix, verified, onset on or before end of MP
absence_of_cervix_condition AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1016'  -- CongenitalOrAcquiredAbsenceOfCervix
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
),

absence_of_cervix AS (
    SELECT patient_id FROM absence_of_cervix_procedure
    UNION SELECT patient_id FROM absence_of_cervix_condition
),

-- 3b. Hospice Services (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3c. Palliative Care (shared function)
palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

-- 3d. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM palliative
    UNION SELECT patient_id FROM absence_of_cervix
),

-- ============================================================
-- 4. NUMERATOR
-- ============================================================

-- 4a. Cervical Cytology (Pap Test) within 3 years
-- effective.latest() during [MP start - 2 years, MP end]
-- isLaboratoryTestPerformed: status IN ('final','amended','corrected') AND category = 'laboratory'
-- value is not null
cervical_cytology AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1017'  -- PapTest
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'laboratory'
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= (mp.mp_start - INTERVAL '2 years')
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end
),

-- 4b. HPV Test within 5 years for women age 30+
-- AgeInYearsAt(date from HPVTest.effective.latest()) >= 30
-- effective.latest() during [MP start - 4 years, MP end]
-- isLaboratoryTestPerformed + value is not null
hpv_test AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1059'  -- HPVTest
    JOIN patient_flat p ON p.id = o.patient_id
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'laboratory'
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= (mp.mp_start - INTERVAL '4 years')
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end
        AND EXTRACT(YEAR FROM AGE(COALESCE(o.effective_end, o.effective_start)::date, p.birth_date::date)) >= 30
),

numerator AS (
    SELECT patient_id FROM cervical_cytology
    UNION SELECT patient_id FROM hpv_test
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
