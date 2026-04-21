-- CMS1154 Screening Prediabetes — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS1154ScreeningPrediabetesFHIR v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql
-- IMPORTANT: Uses timestamptz for MP boundaries to handle Aidbox date storage

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end,
        '2024-01-01T00:00:00Z'::timestamptz AS lb_start  -- Look Back Period start (MP start - 2 years)
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age 35-70 at start of MP
-- AND (exists Preventive Care encounter OR Count Office Visit >= 2)
-- AND (BMI >= 25 non-Asian OR BMI >= 23 Asian)
-- ============================================================

-- Office Visits during MP (Outpatient Clinical Encounters)
office_visits AS (
    SELECT e.patient_id, COUNT(*) AS visit_count
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.24'  -- OutpatientClinicalEncounters
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start AND e.period_start <= mp.mp_end
        AND e.period_end <= mp.mp_end
    GROUP BY e.patient_id
),

-- Preventive Care encounters during MP (period ends during MP)
preventive_encounters AS (
    SELECT DISTINCT e.patient_id
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.13'  -- PreventativeClinicalEncounters
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_end >= mp.mp_start AND e.period_end <= mp.mp_end
),

-- Patients with qualifying visits
qualifying_visits AS (
    SELECT patient_id FROM preventive_encounters
    UNION
    SELECT patient_id FROM office_visits WHERE visit_count >= 2
),

-- Most Recent BMI per patient (USCoreBMIProfile = code 39156-5)
most_recent_bmi AS (
    SELECT DISTINCT ON (o.resource->'subject'->>'id')
        o.resource->'subject'->>'id' AS patient_id,
        (o.resource->'value'->'Quantity'->>'value')::numeric AS bmi_value
    FROM observation o
    WHERE o.resource->'code'->'coding'->0->>'code' = '39156-5'
        AND o.resource->>'status' IN ('final', 'amended', 'corrected')
    ORDER BY o.resource->'subject'->>'id',
        COALESCE(
            (o.resource->'effective'->>'dateTime')::timestamptz,
            (o.resource->'effective'->'Period'->>'start')::timestamptz
        ) DESC
),

-- Patient is Asian (us-core-race extension with ombCategory code 2028-9)
patient_is_asian AS (
    SELECT p.id AS patient_id
    FROM patient p
    WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(p.resource->'extension') ext
        WHERE ext->>'url' = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(ext->'extension') sub
            WHERE sub->>'url' = 'ombCategory'
            AND sub->'value'->'Coding'->>'code' = '2028-9'
        )
    )
),

-- BMI threshold check
bmi_eligible AS (
    SELECT b.patient_id
    FROM most_recent_bmi b
    LEFT JOIN patient_is_asian a ON a.patient_id = b.patient_id
    WHERE (a.patient_id IS NOT NULL AND b.bmi_value >= 23)     -- Asian: >= 23
       OR (a.patient_id IS NULL AND b.bmi_value >= 25)         -- Non-Asian: >= 25
),

initial_population AS (
    SELECT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_start, p.birth_date::date)) BETWEEN 35 AND 70
        AND p.id IN (SELECT patient_id FROM qualifying_visits)
        AND p.id IN (SELECT patient_id FROM bmi_eligible)
),


-- ============================================================
-- 3. DENOMINATOR EXCLUSIONS (6 paths)
-- ============================================================

-- 3a. Pregnancy Observation (USCoreObservationPregnancyStatusProfile with value in Pregnancy VS)
pregnancy_observation AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378'  -- Pregnancy
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= mp.mp_end
        AND (o.effective_end IS NULL OR o.effective_end >= mp.mp_start)
),

-- 3b. Pregnancy Diagnosis (Condition in Pregnancy VS, verified, prevalenceInterval overlaps MP)
pregnancy_diagnosis AS (
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

-- 3c. Advanced Illness or Limited Life Expectancy (onset before end of MP)
advanced_illness_lle AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082',  -- AdvancedIllness
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1259'              -- LimitedLifeExpectancy
        )
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
),

-- 3d. Diabetes Diagnosis overlaps Look Back Period
diabetes_lookback AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.103.12.1001'  -- Diabetes
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date < mp.mp_start  -- prevalenceInterval overlaps [lb_start, mp_start)
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.lb_start)
),

-- 3e. Prediabetes Diagnosis overlaps Look Back Period
prediabetes_lookback AS (
    SELECT DISTINCT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1222.419'  -- Prediabetes(BorderlineDiabetes)
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date < mp.mp_start  -- prevalenceInterval overlaps [lb_start, mp_start)
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.lb_start)
),

-- 3f. Glycemic Lab Test in Look Back Period
glycemic_lookback AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.5'  -- GlycemicScreeningTests
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= mp.lb_start
        AND o.effective_start < mp.mp_start
),

-- 3g. All exclusions combined
denominator_exclusion AS (
    SELECT patient_id FROM pregnancy_observation
    UNION SELECT patient_id FROM pregnancy_diagnosis
    UNION SELECT patient_id FROM advanced_illness_lle
    UNION SELECT patient_id FROM diabetes_lookback
    UNION SELECT patient_id FROM prediabetes_lookback
    UNION SELECT patient_id FROM glycemic_lookback
),

-- ============================================================
-- 4. NUMERATOR — Glycemic Lab Test during MP
-- ============================================================
glycemic_test_mp AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.5'  -- GlycemicScreeningTests
    CROSS JOIN mp
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

numerator AS (
    SELECT patient_id FROM glycemic_test_mp
    WHERE patient_id IN (SELECT patient_id FROM initial_population)
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
