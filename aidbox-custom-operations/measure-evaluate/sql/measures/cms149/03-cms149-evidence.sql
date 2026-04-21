-- CMS149 Patient-Level Evidence Query
-- Shows WHY each patient is in/out of each population
--
-- Usage: copy all CTEs from 02-cms149-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (cognitive assessments)
-- ============================================================
-- ============================================================
-- EVIDENCE: Initial Population qualifying encounters
-- ============================================================
ip_evidence AS (
    SELECT DISTINCT e.patient_id, 'dementia_encounter' AS pathway,
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
    SELECT DISTINCT o.patient_id, 'cognitive_assessment' AS pathway,
           'Observation' AS resource_type, o.id AS resource_id,
           o.code, vs.display AS code_display,
           o.effective_start AS event_date, 'numerator' AS source_cte
    FROM observation_flat o
    JOIN concepts vs
        ON vs.system = o.code_system
        AND vs.code = o.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1006',  -- StandardizedToolsForAssessmentOfCognition
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1332'   -- CognitiveAssessment
        )
    JOIN dementia_encounter de
        ON de.patient_id = o.patient_id
    WHERE o.has_value = true
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= de.period_end
        AND o.effective_start >= (de.period_end - INTERVAL '12 months')
),

-- ============================================================
-- EVIDENCE: Exception — real resource references
-- ============================================================
exception_evidence AS (
    SELECT DISTINCT o.resource->'subject'->>'id' AS patient_id,
           'patient_reason_not_done' AS exclusion_pathway,
           'Observation' AS exc_resource_type,
           o.id AS exc_resource_id
    FROM observation o
    JOIN dementia_encounter de
        ON de.patient_id = o.resource->'subject'->>'id'
    WHERE o.resource->>'status' = 'cancelled'
        AND EXISTS (
            SELECT 1 FROM concepts vs
            WHERE vs.system = o.resource->'code'->'coding'->0->>'system'
                AND vs.code = o.resource->'code'->'coding'->0->>'code'
                AND vs.valueset_url IN (
                    'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1006',
                    'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1332'
                )
        )
        AND (o.resource->>'issued')::timestamptz >= de.period_start
        AND (o.resource->>'issued')::timestamptz <= de.period_end
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(o.resource->'extension') ext
            JOIN concepts pr
                ON pr.system = ext->'value'->'CodeableConcept'->'coding'->0->>'system'
                AND pr.code = ext->'value'->'CodeableConcept'->'coding'->0->>'code'
                AND pr.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1008'
            WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
        )
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
LEFT JOIN exception_evidence ee ON ee.patient_id = mr.patient_id
ORDER BY mr.patient_id, ne.pathway, ne.event_date;
