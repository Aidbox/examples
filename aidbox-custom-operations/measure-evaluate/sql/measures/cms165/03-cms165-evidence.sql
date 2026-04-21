-- CMS165 Patient-Level Evidence Query
-- Minimal evidence contract: for each patient, shows not just flags but WHY
--
-- Usage: copy all CTEs from 02-cms165-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.
--
-- CMS165 numerator is BP control: most recent qualifying BP day,
-- lowest systolic < 140 AND lowest diastolic < 90.
--
-- This measure tests the evidence format differently from screening measures:
-- evidence includes numeric VALUES (systolic/diastolic), not just codes.
-- Additional columns: systolic, diastolic (measure-specific).
--
-- Output: one row per qualifying BP reading on the most recent day per patient.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (qualifying BP readings)
-- Shows all BP readings on the most recent qualifying day.
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
    SELECT qbp.patient_id,
           CASE
               WHEN bpd.lowest_systolic < 140 AND bpd.lowest_diastolic < 90 THEN 'bp_controlled'
               ELSE 'bp_uncontrolled'
           END AS pathway,
           'Observation' AS resource_type,
           qbp.obs_id AS resource_id,
           '85354-9' AS code,
           'Blood pressure panel' AS code_display,
           qbp.effective_date AS event_date,
           'qualifying_bp' AS source_cte,
           qbp.systolic,
           qbp.diastolic
    FROM qualifying_bp qbp
    JOIN most_recent_bp_day mrd ON mrd.patient_id = qbp.patient_id
        AND qbp.effective_date::date = mrd.bp_date
    LEFT JOIN bp_on_most_recent_day bpd ON bpd.patient_id = qbp.patient_id
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
    -- Pregnancy/Renal Diagnosis → Condition
    SELECT DISTINCT c.patient_id, 'pregnancy_renal',
           'Condition', c.id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.378',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.353',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1029',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1002'
        )
    WHERE c.patient_id IN (SELECT patient_id FROM pregnancy_renal)

    UNION ALL
    -- ESRD Procedures → Procedure (Kidney Transplant, Dialysis)
    SELECT DISTINCT pr.patient_id, 'esrd_procedures',
           'Procedure', pr.id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1012',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1013'
        )
    WHERE pr.patient_id IN (SELECT patient_id FROM esrd_procedures)

    UNION ALL
    -- ESRD Encounter → Encounter
    SELECT DISTINCT e.patient_id, 'esrd_encounter',
           'Encounter', e.id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.109.12.1014'
    WHERE e.patient_id IN (SELECT patient_id FROM esrd_encounter)

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
-- Extends the standard envelope with systolic/diastolic columns.
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
    ne.systolic,
    ne.diastolic,
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
