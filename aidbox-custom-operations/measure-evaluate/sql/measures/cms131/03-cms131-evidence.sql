-- CMS131 Patient-Level Evidence Query
-- Minimal evidence contract: for each patient, shows not just flags but WHY
--
-- Usage: copy all CTEs from 02-cms131-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.
--
-- CMS131 has 5 numerator pathways (bifurcated retinal exam logic):
--   1. retinopathy + retinal exam in MP
--   2. no retinopathy + retinal exam in MP or year prior
--   3. autonomous eye exam
--   4. retinopathy severity finding (left/right eye)
--   5. no retinopathy finding in year prior (both eyes)
--
-- Output: one row per qualifying evidence per patient.

-- ============================================================
-- EVIDENCE: Numerator triggering resources (all qualifying evidence)
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
    -- Retinal exam during MP
    SELECT o.patient_id, 'retinal_exam_mp' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           o.effective_start AS event_date, 'retinal_exam_in_mp' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.115.12.1088'  -- RetinalOrDilatedEyeExam
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM retinal_exam_in_mp)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Retinal exam in year prior (for patients without retinopathy)
    SELECT o.patient_id, 'retinal_exam_year_prior', 'Observation',
           o.id, o.code, vs.display,
           o.effective_start, 'retinal_exam_in_mp_or_year_prior'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.115.12.1088'  -- RetinalOrDilatedEyeExam
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM retinal_exam_in_mp_or_year_prior)
        AND o.patient_id NOT IN (SELECT patient_id FROM retinal_exam_in_mp)
        AND o.patient_id NOT IN (SELECT patient_id FROM has_diabetic_retinopathy)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= (mp.mp_start - INTERVAL '1 year')
        AND o.effective_start < mp.mp_start

    UNION ALL

    -- Autonomous eye exam
    SELECT o.patient_id, 'autonomous_eye_exam', 'Observation',
           o.id, o.code, vs.display AS code_display,
           o.effective_start, 'autonomous_eye_exam'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1004.2616'  -- AutonomousEyeExamResultOrFinding
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM autonomous_eye_exam)
        AND o.code = '105914-6' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Left eye retinopathy severity
    SELECT o.patient_id, 'retinopathy_severity_left', 'Observation',
           o.id, o.code, vs.display,
           o.effective_start, 'has_left_eye_retinopathy'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1266'  -- DiabeticRetinopathySeverityLevel
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM has_left_eye_retinopathy)
        AND o.code = '71490-7' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Right eye retinopathy severity
    SELECT o.patient_id, 'retinopathy_severity_right', 'Observation',
           o.id, o.code, vs.display,
           o.effective_start, 'has_right_eye_retinopathy'
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1266'  -- DiabeticRetinopathySeverityLevel
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM has_right_eye_retinopathy)
        AND o.code = '71491-5' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.mp_start AND o.effective_start <= mp.mp_end

    UNION ALL

    -- Left eye no retinopathy in year prior
    SELECT o.patient_id, 'no_retinopathy_left_prior', 'Observation',
           o.id, o.code, 'No diabetic retinopathy (left eye)' AS code_display,
           o.effective_start, 'has_left_eye_no_retinopathy_prior'
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM has_left_eye_no_retinopathy_prior)
        AND o.code = '71490-7' AND o.code_system = 'http://loinc.org'
        AND o.value_code = 'LA18643-9'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.year_prior_start AND o.effective_start <= mp.year_prior_end

    UNION ALL

    -- Right eye no retinopathy in year prior
    SELECT o.patient_id, 'no_retinopathy_right_prior', 'Observation',
           o.id, o.code, 'No diabetic retinopathy (right eye)' AS code_display,
           o.effective_start, 'has_right_eye_no_retinopathy_prior'
    FROM observation_flat o
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM has_right_eye_no_retinopathy_prior)
        AND o.code = '71491-5' AND o.code_system = 'http://loinc.org'
        AND o.value_code = 'LA18643-9'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.category_code = 'exam'
        AND o.effective_start >= mp.year_prior_start AND o.effective_start <= mp.year_prior_end
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

    UNION ALL
    -- Bilateral Absence of Eyes → Condition (SNOMED 15665641000119103)
    SELECT DISTINCT c.patient_id, 'bilateral_absence_eyes',
           'Condition', c.id
    FROM condition_flat c
    WHERE c.code = '15665641000119103' AND c.code_system = 'http://snomed.info/sct'
        AND c.patient_id IN (SELECT patient_id FROM bilateral_absence_eyes)
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

