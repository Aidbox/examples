-- CMS124 Patient-Level Evidence Query
-- Minimal evidence contract: for each patient, shows not just flags but WHY
--
-- Usage: copy all CTEs from 02-cms124-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.
--
-- Output: one row per qualifying event per patient. Patients with multiple
-- qualifying screenings get multiple rows. Patients not in numerator get
-- one row with pathway='none'.

-- ============================================================
-- EVIDENCE: All numerator triggering resources (all qualifying events)
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
    -- Cervical Cytology (Pap Test)
    SELECT o.patient_id, 'cervical_cytology' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           COALESCE(o.effective_end, o.effective_start) AS event_date, 'cervical_cytology' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1017'  -- PapTest
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM cervical_cytology)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'laboratory'
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= (mp.mp_start - INTERVAL '2 years')
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end

    UNION ALL

    -- HPV Test
    SELECT o.patient_id, 'hpv_test', 'Observation',
           o.id, o.code, vs.display,
           COALESCE(o.effective_end, o.effective_start), 'hpv_test'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1059'  -- HPVTest
    JOIN patient_flat p ON p.id = o.patient_id
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM hpv_test)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'laboratory'
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= (mp.mp_start - INTERVAL '4 years')
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end
        AND EXTRACT(YEAR FROM AGE(COALESCE(o.effective_end, o.effective_start)::date, p.birth_date::date)) >= 30
),

-- ============================================================
-- EVIDENCE: Exclusion — real resource references
-- ============================================================
exclusion_evidence AS (
    -- Absence of Cervix Procedure → Procedure
    SELECT DISTINCT pr.patient_id, 'absence_of_cervix' AS exclusion_pathway,
           'Procedure' AS exc_resource_type, pr.id AS exc_resource_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1014'
    WHERE pr.patient_id IN (SELECT patient_id FROM denominator_exclusion)

    UNION ALL
    -- Absence of Cervix Condition → Condition
    SELECT DISTINCT c.patient_id, 'absence_of_cervix',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1016'
    WHERE c.patient_id IN (SELECT patient_id FROM denominator_exclusion)

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
