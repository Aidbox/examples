-- CMS143 Patient-Level Evidence Query
-- For each patient, shows WHY they are in each population
--
-- Usage: copy all CTEs from 02-cms143-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.

-- ============================================================
-- EVIDENCE: Numerator (Cup to Disc Ratio + Optic Disc Exam)
-- ============================================================
numerator_evidence AS (
    -- Cup to Disc Ratio
    SELECT o.patient_id, 'cup_to_disc_ratio' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           o.effective_start AS event_date, 'cup_to_disc' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1333'
    WHERE o.patient_id IN (SELECT patient_id FROM cup_to_disc)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true

    UNION ALL

    -- Optic Disc Exam
    SELECT o.patient_id, 'optic_disc_exam', 'Observation',
           o.id, o.code, vs.display,
           o.effective_start, 'optic_disc_exam'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1334'
    WHERE o.patient_id IN (SELECT patient_id FROM optic_disc_exam)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
),

-- ============================================================
-- EVIDENCE: Exception — real resource references
-- ============================================================
exclusion_evidence AS (
    -- Medical Reason Cup to Disc → Observation (cancelled)
    SELECT DISTINCT o.resource#>>'{subject,id}' AS patient_id,
           'medical_reason_cup_to_disc' AS exclusion_pathway,
           'Observation' AS exc_resource_type,
           o.id AS exc_resource_id
    FROM observation o
    JOIN concepts vs ON vs.system = o.resource->'code'->'coding'->0->>'system'
        AND vs.code = o.resource->'code'->'coding'->0->>'code'
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1333'
    WHERE o.resource->>'status' = 'cancelled'
        AND o.resource#>>'{subject,id}' IN (SELECT patient_id FROM medical_reason_cup_to_disc)

    UNION ALL
    -- Medical Reason Optic Disc → Observation (cancelled)
    SELECT DISTINCT o.resource#>>'{subject,id}',
           'medical_reason_optic_disc',
           'Observation',
           o.id
    FROM observation o
    JOIN concepts vs ON vs.system = o.resource->'code'->'coding'->0->>'system'
        AND vs.code = o.resource->'code'->'coding'->0->>'code'
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1334'
    WHERE o.resource->>'status' = 'cancelled'
        AND o.resource#>>'{subject,id}' IN (SELECT patient_id FROM medical_reason_optic_disc)
),

-- ============================================================
-- EVIDENCE: Initial Population — POAG encounter (encounter WITH active POAG diagnosis)
-- ============================================================
ip_evidence AS (
    SELECT DISTINCT pe.patient_id, 'poag_encounter' AS pathway,
           'Encounter' AS resource_type, pe.encounter_id AS resource_id,
           e.type_code AS code, vs.display AS code_display,
           pe.period_start AS event_date, 'initial_population' AS source_cte
    FROM poag_encounters pe
    JOIN initial_population ip ON ip.patient_id = pe.patient_id
    JOIN encounter_flat e ON e.id = pe.encounter_id AND e.patient_id = pe.patient_id
    LEFT JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
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
    ie.pathway AS ip_pathway,
    ie.source_cte AS ip_source_cte,
    ie.resource_type AS ip_resource_type,
    ie.resource_id AS ip_resource_id,
    ie.code_display AS ip_code_display,
    ie.event_date AS ip_event_date
FROM measure_results mr
LEFT JOIN ip_evidence ie ON ie.patient_id = mr.patient_id
LEFT JOIN numerator_evidence ne ON ne.patient_id = mr.patient_id
LEFT JOIN exclusion_evidence ee ON ee.patient_id = mr.patient_id
ORDER BY mr.patient_id, pathway;
