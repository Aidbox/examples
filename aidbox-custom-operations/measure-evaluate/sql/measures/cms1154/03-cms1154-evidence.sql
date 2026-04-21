-- CMS1154 Patient-Level Evidence Query
-- Shows WHY each patient has their gap status: which exclusion or numerator pathway triggered.
--
-- Usage: copy all CTEs from 02-cms1154-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (glycemic tests in MP)
-- ============================================================
-- ============================================================
-- EVIDENCE: Initial Population qualifying encounters
-- ============================================================
ip_evidence AS (
    SELECT DISTINCT e.patient_id, 'qualifying_encounter' AS pathway,
           'Encounter' AS resource_type, e.id AS resource_id,
           e.type_code AS code, vs.display AS code_display,
           e.period_start AS event_date, 'initial_population' AS source_cte
    FROM encounter_flat e
    JOIN initial_population ip ON ip.patient_id = e.patient_id
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
    CROSS JOIN mp
    WHERE e.period_start >= mp.mp_start AND e.period_end <= mp.mp_end
),

numerator_evidence AS (
    SELECT o.patient_id, 'glycemic_test_mp' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           o.effective_start AS event_date, 'glycemic_test_mp' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.5'  -- GlycemicScreeningTests
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
),

-- ============================================================
-- EVIDENCE: Exclusion — real resource references
-- ============================================================
exclusion_evidence AS (
    -- Pregnancy Observation → Observation
    SELECT DISTINCT o.patient_id, 'pregnancy_observation' AS exclusion_pathway,
           'Observation' AS exc_resource_type, o.id AS exc_resource_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378'
    WHERE o.patient_id IN (SELECT patient_id FROM pregnancy_observation)

    UNION ALL
    -- Pregnancy Diagnosis → Condition
    SELECT DISTINCT c.patient_id, 'pregnancy_diagnosis',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378'
    WHERE c.patient_id IN (SELECT patient_id FROM pregnancy_diagnosis)

    UNION ALL
    -- Advanced Illness / Limited Life Expectancy → Condition
    SELECT DISTINCT c.patient_id, 'advanced_illness_lle',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1259'
        )
    WHERE c.patient_id IN (SELECT patient_id FROM advanced_illness_lle)

    UNION ALL
    -- Diabetes Lookback → Condition
    SELECT DISTINCT c.patient_id, 'diabetes_lookback',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.103.12.1001'
    WHERE c.patient_id IN (SELECT patient_id FROM diabetes_lookback)

    UNION ALL
    -- Prediabetes Lookback → Condition
    SELECT DISTINCT c.patient_id, 'prediabetes_lookback',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1222.419'
    WHERE c.patient_id IN (SELECT patient_id FROM prediabetes_lookback)

    UNION ALL
    -- Glycemic Lookback → Observation
    SELECT DISTINCT o.patient_id, 'glycemic_lookback',
           'Observation', o.id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113762.1.4.1160.5'
    WHERE o.patient_id IN (SELECT patient_id FROM glycemic_lookback)
)

-- ============================================================
-- OUTPUT: Patient-level evidence table
-- ============================================================
SELECT
    mr.patient_id,
    mr.in_initial_population AS ip,
    mr.in_denominator AS den,
    mr.in_exclusion AS exc,
    mr.in_numerator AS num,
    COALESCE(ne.pathway, 'none') AS pathway,
    ne.resource_type,
    ne.resource_id,
    ne.code,
    ne.code_display,
    ne.event_date,
    ne.source_cte,
    ee.exclusion_pathway,
    ee.exc_resource_type,
    ee.exc_resource_id,
    ie.resource_type AS ip_resource_type,
    ie.resource_id AS ip_resource_id,
    ie.code_display AS ip_code_display,
    ie.event_date AS ip_event_date
FROM measure_results mr
LEFT JOIN ip_evidence ie ON ie.patient_id = mr.patient_id
LEFT JOIN numerator_evidence ne ON ne.patient_id = mr.patient_id
LEFT JOIN exclusion_evidence ee ON ee.patient_id = mr.patient_id
ORDER BY mr.patient_id, ne.pathway, ne.event_date;
