-- CMS139 Patient-Level Evidence Query
-- For each patient, shows not just flags but WHY
--
-- Usage: copy all CTEs from 02-cms139-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.
--
-- Output: one row per qualifying event per patient. Patients not in numerator
-- get one row with pathway='none'.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (Falls Screening)
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
    SELECT o.patient_id, 'falls_screening' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           o.effective_start AS event_date, 'falls_screening' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1028'  -- FallsScreening
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM falls_screening)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start >= mp.mp_start
        AND o.effective_start <= mp.mp_end
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
    -- Hospice Observation → Observation
    SELECT DISTINCT o.patient_id, 'hospice',
           'Observation', o.id
    FROM observation_flat o
    WHERE o.code = '45755-6' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.patient_id IN (SELECT patient_id FROM hospice)

    UNION ALL
    -- Hospice Order → ServiceRequest
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
)

-- ============================================================
-- OUTPUT: Patient-level evidence table
-- One row per qualifying event. Patients not in numerator: one row with pathway='none'.
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
