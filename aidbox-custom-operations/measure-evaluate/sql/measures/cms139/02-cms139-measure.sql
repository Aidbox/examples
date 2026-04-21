-- CMS139 Fall Risk Screening — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS139FHIRFallRiskScreening v1.0.000
--
-- Population: age >= 65 at START of MP, qualifying encounter during MP
-- Exclusions: Hospice only (6 sub-checks)
-- Numerator: Falls Screening observation (ObservationScreeningAssessment) during MP
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, cms139/sql/00-terminology-data.sql

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age >= 65 at START of MP AND qualifying encounter during MP
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
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080',  -- TelephoneVisits
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089',  -- VirtualEncounter
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1285',  -- OphthalmologicalServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1026',  -- PreventiveCareServicesIndividualCounseling
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1013',  -- DischargeServicesNursingFacility
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1012',  -- NursingFacilityVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1014',  -- CareServicesInLongTermResidentialFacility
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1066',  -- AudiologyVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1022',  -- PhysicalTherapyEvaluation
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1011'   -- OccupationalTherapyEvaluation
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
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_start, p.birth_date::date)) >= 65
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS — Hospice only (6 sub-checks)
-- ============================================================

-- 3a. Hospice Services (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

denominator_exclusion AS (
    SELECT patient_id FROM hospice
),

-- ============================================================
-- 4. NUMERATOR — Falls Screening during MP
-- ObservationScreeningAssessment: "Falls Screening"
-- isAssessmentPerformed(): status IN ('final', 'amended', 'corrected')
-- effective during day of MP
-- ============================================================
falls_screening AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1028'  -- FallsScreening
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

numerator AS (
    SELECT patient_id FROM falls_screening
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
