-- CMS165 Controlling High Blood Pressure — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS165FHIRControllingHighBP v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql, concepts table populated

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end,
        '2026-07-01T00:00:00Z'::timestamptz AS mp_6mo  -- start + 6 months
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 18-85, essential hypertension in first 6mo, qualifying encounter
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

essential_hypertension AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.104.12.1011'  -- EssentialHypertension
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date < mp.mp_6mo
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) BETWEEN 18 AND 85
        AND p.id IN (SELECT patient_id FROM qualifying_encounters)
        AND p.id IN (SELECT patient_id FROM essential_hypertension)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS
-- ============================================================

-- 3a. Hospice (shared function)
hospice AS (SELECT h.* FROM mp, LATERAL shared_hospice(mp.mp_start, mp.mp_end) h),

-- 3b. Pregnancy or Renal Diagnosis
pregnancy_renal AS (
    SELECT DISTINCT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN ('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.353', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1029', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1002')  -- ChronicKidneyDiseaseStage5
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL OR c.verification_status IN ('confirmed','unconfirmed','provisional','differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)
),

-- 3c. ESRD Procedures (Kidney Transplant, Dialysis)
esrd_procedures AS (
    SELECT DISTINCT pr.patient_id FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url IN ('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1012', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1013')  -- KidneyTransplant
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_end <= mp.mp_end
),

-- 3d. ESRD Monthly Outpatient Encounter
esrd_encounter AS (
    SELECT DISTINCT e.patient_id FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1014'  -- ESRDMonthlyOutpatientServices
    CROSS JOIN mp
    WHERE e.status = 'finished' AND e.period_start <= mp.mp_end
),

-- 3e. Palliative Care (shared function)
palliative AS (SELECT h.* FROM mp, LATERAL shared_palliative(mp.mp_start, mp.mp_end) h),

-- 3f. Advanced Illness + Frailty (66-80) OR Frailty only (>=81)
-- CMS165-specific: uses age split, cannot use shared_advanced_illness_frailty
patients_66_plus AS (
    SELECT p.id AS patient_id, EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) AS age
    FROM patient_flat p CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_end, p.birth_date::date)) >= 66
),
has_frailty AS (SELECT h.* FROM mp, LATERAL shared_has_frailty(mp.mp_start, mp.mp_end) h),
advanced_illness AS (SELECT h.* FROM mp, LATERAL shared_advanced_illness(mp.mp_start, mp.mp_end) h),
dementia_meds AS (SELECT h.* FROM mp, LATERAL shared_dementia_meds(mp.mp_start, mp.mp_end) h),
advanced_illness_frailty AS (
    -- 66-80: frailty AND (advanced illness OR dementia meds)
    SELECT p66.patient_id FROM patients_66_plus p66
    JOIN has_frailty f ON f.patient_id = p66.patient_id
    LEFT JOIN advanced_illness ai ON ai.patient_id = p66.patient_id
    LEFT JOIN dementia_meds dm ON dm.patient_id = p66.patient_id
    WHERE p66.age BETWEEN 66 AND 80
        AND (ai.patient_id IS NOT NULL OR dm.patient_id IS NOT NULL)
    UNION
    -- >=81: frailty only
    SELECT p66.patient_id FROM patients_66_plus p66
    JOIN has_frailty f ON f.patient_id = p66.patient_id
    WHERE p66.age >= 81
),

-- 3g. Nursing Home (shared function, age >= 66)
nursing_home AS (SELECT h.* FROM mp, LATERAL shared_nursing_home(mp.mp_start, mp.mp_end) h),

-- 3h. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM hospice
    UNION SELECT patient_id FROM pregnancy_renal
    UNION SELECT patient_id FROM esrd_procedures
    UNION SELECT patient_id FROM esrd_encounter
    UNION SELECT patient_id FROM palliative
    UNION SELECT patient_id FROM advanced_illness_frailty
    UNION SELECT patient_id FROM nursing_home
),

-- ============================================================
-- 4. NUMERATOR — Blood Pressure control
-- Most recent BP day → lowest systolic < 140 AND lowest diastolic < 90
-- ============================================================

-- All BP observations (USCoreBloodPressureProfile: code=85354-9, category=vital-signs)
bp_observations AS (
    SELECT
        o.resource->'subject'->>'id' AS patient_id,
        o.id AS obs_id,
        COALESCE(
            (o.resource->'effective'->>'dateTime')::timestamptz,
            (o.resource->'effective'->'Period'->>'start')::timestamptz
        ) AS effective_date,
        o.resource->'encounter'->>'id' AS encounter_id,
        -- Extract systolic component value
        (SELECT (comp->'value'->'Quantity'->>'value')::numeric
         FROM jsonb_array_elements(o.resource->'component') comp
         WHERE comp->'code'->'coding'->0->>'code' = '8480-6'
         LIMIT 1) AS systolic,
        -- Extract diastolic component value
        (SELECT (comp->'value'->'Quantity'->>'value')::numeric
         FROM jsonb_array_elements(o.resource->'component') comp
         WHERE comp->'code'->'coding'->0->>'code' = '8462-4'
         LIMIT 1) AS diastolic
    FROM observation o
    CROSS JOIN mp
    WHERE o.resource->'code'->'coding'->0->>'code' = '85354-9'
        AND o.resource->>'status' IN ('final', 'amended', 'corrected')
        AND COALESCE(
            (o.resource->'effective'->>'dateTime')::timestamptz,
            (o.resource->'effective'->'Period'->>'start')::timestamptz
        ) >= mp.mp_start
        AND COALESCE(
            (o.resource->'effective'->>'dateTime')::timestamptz,
            (o.resource->'effective'->'Period'->>'start')::timestamptz
        ) <= mp.mp_end
),

-- Disqualifying encounters (inpatient + ED)
disqualifying_encounters AS (
    SELECT e.id AS encounter_id, e.patient_id, e.period_start, e.period_end
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url IN ('http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.666.5.307', 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1010')  -- EncounterInpatient, EmergencyDepartmentEvaluationAndManagementVisit
    WHERE e.status = 'finished'
    UNION
    -- Also filter by encounter class
    SELECT e.id AS encounter_id, e.patient_id, e.period_start, e.period_end
    FROM encounter_flat e
    JOIN encounter r ON r.id = e.id
    WHERE e.status = 'finished'
        AND r.resource->'class'->>'code' IN ('EMER', 'IMP', 'ACUTE', 'NONAC', 'PRENC', 'SS')
),

-- Qualifying BP readings: during MP, NOT during disqualifying encounters
qualifying_bp AS (
    SELECT bp.*
    FROM bp_observations bp
    WHERE NOT EXISTS (
        SELECT 1 FROM disqualifying_encounters de
        WHERE de.encounter_id = bp.encounter_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM disqualifying_encounters de
        WHERE de.patient_id = bp.patient_id
            AND bp.effective_date::date >= de.period_start::date
            AND bp.effective_date::date <= de.period_end::date
    )
),

-- Most recent BP day per patient
most_recent_bp_day AS (
    SELECT patient_id, MAX(effective_date::date) AS bp_date
    FROM qualifying_bp
    GROUP BY patient_id
),

-- Lowest systolic and diastolic on most recent day
bp_on_most_recent_day AS (
    SELECT
        qbp.patient_id,
        MIN(qbp.systolic) AS lowest_systolic,
        MIN(qbp.diastolic) AS lowest_diastolic
    FROM qualifying_bp qbp
    JOIN most_recent_bp_day mrd ON mrd.patient_id = qbp.patient_id
        AND qbp.effective_date::date = mrd.bp_date
    GROUP BY qbp.patient_id
),

numerator AS (
    SELECT patient_id
    FROM bp_on_most_recent_day
    WHERE lowest_systolic < 140 AND lowest_diastolic < 90
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
