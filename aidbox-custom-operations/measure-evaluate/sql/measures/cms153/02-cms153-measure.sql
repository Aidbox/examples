-- CMS153 Chlamydia Screening — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS153FHIRChlamydiaScreening v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql
-- IMPORTANT: Uses timestamptz for MP boundaries to handle Aidbox date storage

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 16-24 at end of MP AND female (Patient.sex = 248152002)
-- AND qualifying encounter during MP
-- AND evidence of sexual activity
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
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1022',  -- PreventiveCareServicesInitialOfficeVisit0to17
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1024',  -- PreventiveCareEstablishedOfficeVisit0to17
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',  -- HomeHealthcareServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080',  -- TelephoneVisits
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089'   -- VirtualEncounter
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start
        AND e.period_start <= mp.mp_end
),

-- Sexual activity evidence: Assessments (ObservationScreeningAssessment code=64728-9, value=373066001)
has_assessments AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.code = '64728-9' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= mp.mp_end
),

-- Sexual activity evidence: Diagnoses (3 valuesets, verified, prevalence overlaps MP)
has_diagnoses AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1018',  -- DiagnosesUsedToIndicateSexualActivity
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.120.12.1003',  -- HIV
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1012'   -- ComplicationsOfPregnancy
        )
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

-- Sexual activity evidence: Active contraceptive medications (overlaps MP)
has_active_contraceptives AS (
    SELECT DISTINCT mr.patient_id
    FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1080'  -- ContraceptiveMedications
    CROSS JOIN mp
    WHERE mr.status = 'active'
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND COALESCE(mr.validity_start, mr.authored_on) <= mp.mp_end
        AND COALESCE(mr.validity_end, mr.authored_on) >= mp.mp_start
),

-- Sexual activity evidence: Ordered contraceptive medications (authoredOn during MP)
has_ordered_contraceptives AS (
    SELECT DISTINCT mr.patient_id
    FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1080'  -- ContraceptiveMedications
    CROSS JOIN mp
    WHERE mr.status IN ('active', 'completed')
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND mr.authored_on >= mp.mp_start AND mr.authored_on <= mp.mp_end
),

-- Sexual activity evidence: Lab tests identifying sexual activity (ServiceRequest orders during MP)
-- Includes: Pregnancy Test, Pap Test, Lab Tests During Pregnancy, Lab Tests for STIs
has_lab_tests_sexual_activity AS (
    SELECT DISTINCT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1011',  -- PregnancyTest
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1017',  -- PapTest
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1007',  -- LabTestsDuringPregnancy
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1051'   -- LabTestsForSTIs
        )
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end
),

-- Sexual activity evidence: Diagnostic studies during pregnancy (ServiceRequest during MP)
has_diagnostic_studies AS (
    SELECT DISTINCT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1008'  -- DiagnosticStudiesDuringPregnancy
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end
),

-- Sexual activity evidence: Procedures indicating sexual activity (during MP)
has_procedures_sexual_activity AS (
    SELECT DISTINCT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1017'  -- ProceduresUsedToIndicateSexualActivity
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start >= mp.mp_start
        AND pr.performed_start <= mp.mp_end
),

-- Combined: any evidence of sexual activity
has_sexual_activity AS (
    SELECT patient_id FROM has_assessments
    UNION SELECT patient_id FROM has_diagnoses
    UNION SELECT patient_id FROM has_active_contraceptives
    UNION SELECT patient_id FROM has_ordered_contraceptives
    UNION SELECT patient_id FROM has_lab_tests_sexual_activity
    UNION SELECT patient_id FROM has_diagnostic_studies
    UNION SELECT patient_id FROM has_procedures_sexual_activity
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 16 AND 24
        AND p.sex = '248152002'
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
        AND p.id IN (SELECT patient_id FROM has_sexual_activity)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Hospice Services (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3b. Pregnancy Test Exclusion
-- Patient had pregnancy test + (XRay within 6 days OR Isotretinoin within 6 days)
-- AND no OTHER evidence of sexual activity (besides the pregnancy test itself)

-- Pregnancy test ServiceRequests during MP
pregnancy_test_orders AS (
    SELECT sr.patient_id, sr.authored_on
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1011'  -- PregnancyTest
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end
),

-- XRay study orders
xray_orders AS (
    SELECT sr.patient_id, sr.authored_on
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1034'  -- XRayStudy
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
),

-- Isotretinoin medication orders
isotretinoin_orders AS (
    SELECT mr.patient_id, mr.authored_on
    FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1143'  -- Isotretinoin
    WHERE mr.status IN ('active', 'completed')
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
),

-- Pregnancy test with XRay within 6 days after
pregnancy_xray AS (
    SELECT DISTINCT pt.patient_id
    FROM pregnancy_test_orders pt
    JOIN xray_orders xr ON xr.patient_id = pt.patient_id
        AND xr.authored_on >= pt.authored_on
        AND xr.authored_on <= pt.authored_on + INTERVAL '6 days'
),

-- Pregnancy test with Isotretinoin within 6 days after
pregnancy_isotretinoin AS (
    SELECT DISTINCT pt.patient_id
    FROM pregnancy_test_orders pt
    JOIN isotretinoin_orders iso ON iso.patient_id = pt.patient_id
        AND iso.authored_on >= pt.authored_on
        AND iso.authored_on <= pt.authored_on + INTERVAL '6 days'
),

-- Combined pregnancy test exclusion (has pregnancy+xray or pregnancy+isotretinoin)
has_pregnancy_test_exclusion AS (
    SELECT patient_id FROM pregnancy_xray
    UNION SELECT patient_id FROM pregnancy_isotretinoin
),

-- Lab tests identifying sexual activity BUT NOT pregnancy test
-- (used in exclusion logic: excluded only if NO other sexual activity evidence)
has_lab_tests_not_pregnancy AS (
    SELECT DISTINCT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1017',  -- PapTest
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1007',  -- LabTestsDuringPregnancy
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1051'   -- LabTestsForSTIs
        )
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end
),

-- Pregnancy test exclusion applies ONLY if no other sexual activity evidence
pregnancy_test_exclusion AS (
    SELECT pe.patient_id
    FROM has_pregnancy_test_exclusion pe
    WHERE pe.patient_id NOT IN (SELECT patient_id FROM has_assessments)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_diagnoses)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_active_contraceptives)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_ordered_contraceptives)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_lab_tests_not_pregnancy)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_diagnostic_studies)
        AND pe.patient_id NOT IN (SELECT patient_id FROM has_procedures_sexual_activity)
),

-- 3c. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM pregnancy_test_exclusion
),

-- ============================================================
-- 4. NUMERATOR — Chlamydia screening lab test with value, during MP
-- ============================================================
numerator AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1052'  -- ChlamydiaScreening
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= mp.mp_start
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end
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
