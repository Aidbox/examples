-- CMS125 Patient-Level Evidence Query
-- Minimal evidence contract: for each patient, shows not just flags but WHY
--
-- Usage: copy all CTEs from 02-cms125-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.
--
-- CMS125 has a single numerator pathway: mammography.
-- Output: one row per qualifying mammography per patient.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (all qualifying mammograms)
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
    SELECT o.patient_id, 'mammography' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           o.effective_end AS event_date, 'numerator' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1018'  -- Mammography
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'imaging'
        AND o.effective_end >= mp.mammogram_lookback_start
        AND o.effective_end <= mp.mp_end
),

-- ============================================================
-- EVIDENCE: Exclusion — real resource references
-- ============================================================
exclusion_evidence AS (
    -- Mastectomy Diagnosis → Condition (bilateral, right, left)
    SELECT DISTINCT c.patient_id, 'mastectomy' AS exclusion_pathway,
           'Condition' AS exc_resource_type, c.id AS exc_resource_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1068',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1070',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1069',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1071'
        )
    WHERE c.patient_id IN (SELECT patient_id FROM mastectomy_exclusion)

    UNION ALL
    -- Mastectomy Procedure → Procedure (bilateral, right, left)
    SELECT DISTINCT pr.patient_id, 'mastectomy',
           'Procedure', pr.id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1005',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1134',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1133'
        )
    WHERE pr.patient_id IN (SELECT patient_id FROM mastectomy_exclusion)

    UNION ALL
    -- Hospice Encounter → Encounter
    SELECT DISTINCT e.patient_id, 'hospice',
           'Encounter', e.id
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
    -- Palliative Observation (LOINC 71007-9) → Observation
    SELECT DISTINCT o.patient_id, 'palliative',
           'Observation', o.id
    FROM observation_flat o
    WHERE o.code = '71007-9' AND o.code_system = 'http://loinc.org'
        AND o.patient_id IN (SELECT patient_id FROM palliative)

    UNION ALL
    -- Palliative Diagnosis → Condition
    SELECT DISTINCT c.patient_id, 'palliative',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1167'
    WHERE c.patient_id IN (SELECT patient_id FROM palliative)

    UNION ALL
    -- Palliative Encounter → Encounter
    SELECT DISTINCT e.patient_id, 'palliative',
           'Encounter', e.id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1090'
    WHERE e.patient_id IN (SELECT patient_id FROM palliative)

    UNION ALL
    -- Palliative Procedure → Procedure
    SELECT DISTINCT pr.patient_id, 'palliative',
           'Procedure', pr.id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1135'
    WHERE pr.patient_id IN (SELECT patient_id FROM palliative)
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
ORDER BY mr.patient_id, ne.event_date;

