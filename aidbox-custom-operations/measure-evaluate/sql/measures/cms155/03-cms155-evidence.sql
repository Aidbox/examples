-- CMS155 Patient-Level Evidence Query
-- For each patient, shows WHY they are in each population
--
-- Usage: copy all CTEs from 02-cms155-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.

-- ============================================================
-- EVIDENCE: Numerator (BMI percentile + Height + Weight)
-- ============================================================
numerator_evidence AS (
    -- BMI Percentile
    SELECT o.patient_id, 'bmi_percentile' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, 'BMI Percentile' AS code_display,
           o.effective_start AS event_date, 'has_bmi_percentile' AS source_cte
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.code = '59576-9' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Height
    SELECT o.patient_id, 'height', 'Observation',
           o.id, o.code, 'Body Height',
           o.effective_start, 'has_height'
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.code = '8302-2' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Weight
    SELECT o.patient_id, 'weight', 'Observation',
           o.id, o.code, 'Body Weight',
           o.effective_start, 'has_weight'
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.code = '29463-7' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end
),

-- ============================================================
-- EVIDENCE: Exclusion — real resource references
-- ============================================================
exclusion_evidence AS (
    -- Hospice Encounter → Encounter
    SELECT DISTINCT e.patient_id, 'hospice' AS exclusion_pathway,
           'Encounter' AS exc_resource_type, e.id AS exc_resource_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1003'
    WHERE e.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Hospice Diagnosis → Condition
    SELECT DISTINCT c.patient_id, 'hospice',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1165'
    WHERE c.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Hospice Observation (LOINC 45755-6) → Observation
    SELECT DISTINCT o.patient_id, 'hospice',
           'Observation', o.id
    FROM observation_flat o
    WHERE o.code = '45755-6' AND o.code_system = 'http://loinc.org'
        AND o.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Hospice ServiceRequest → ServiceRequest
    SELECT DISTINCT sr.patient_id, 'hospice',
           'ServiceRequest', sr.id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'
    WHERE sr.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Hospice Procedure → Procedure
    SELECT DISTINCT pr.patient_id, 'hospice',
           'Procedure', pr.id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'
    WHERE pr.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Pregnancy Diagnosis → Condition
    SELECT DISTINCT c.patient_id, 'pregnancy',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378'
    WHERE c.patient_id IN (SELECT patient_id FROM pregnancy_exclusion)
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
    ee.exc_resource_id
FROM measure_results mr
LEFT JOIN numerator_evidence ne ON ne.patient_id = mr.patient_id
LEFT JOIN exclusion_evidence ee ON ee.patient_id = mr.patient_id
ORDER BY mr.patient_id, pathway;
