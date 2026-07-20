-- CMS153 Patient-Level Evidence Query
-- For each patient, shows WHY they are in each population
--
-- Usage: copy all CTEs from 02-cms153-measure.sql up to (and including)
-- measure_results, then append these CTEs and the final SELECT.

-- ============================================================
-- EVIDENCE: Numerator (Chlamydia screening)
-- ============================================================
numerator_evidence AS (
    SELECT o.patient_id, 'chlamydia_screening' AS pathway, 'Observation' AS resource_type,
           o.id AS resource_id, o.code, vs.display AS code_display,
           COALESCE(o.effective_end, o.effective_start) AS event_date, 'numerator' AS source_cte
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1052'
    CROSS JOIN mp
    WHERE o.patient_id IN (SELECT patient_id FROM numerator)
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND COALESCE(o.effective_end, o.effective_start) >= mp.mp_start
        AND COALESCE(o.effective_end, o.effective_start) <= mp.mp_end
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
    -- Pregnancy Test Exclusion → ServiceRequest (pregnancy test order that triggered exclusion)
    SELECT DISTINCT sr.patient_id, 'pregnancy_test_exclusion',
           'ServiceRequest', sr.id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1011'
    WHERE sr.patient_id IN (SELECT patient_id FROM pregnancy_test_exclusion)


    -- Catch-all coverage: one summary row per exclusion CTE so every excluded patient
    -- has an exclusion_pathway even for shared-function paths / sub-paths not detailed above.
    UNION ALL SELECT DISTINCT patient_id, 'hospice' AS exclusion_pathway, 'summary' AS exc_resource_type, NULL::text AS exc_resource_id FROM hospice
    UNION ALL SELECT DISTINCT patient_id, 'pregnancy_test_exclusion' AS exclusion_pathway, 'summary' AS exc_resource_type, NULL::text AS exc_resource_id FROM pregnancy_test_exclusion
),

-- ============================================================
-- EVIDENCE: Initial Population — qualifying encounter AND sexual-activity evidence
-- IP for CMS153 requires BOTH: a qualifying encounter type AND at least one of
-- 7 sexual-activity pathways (assessment / diagnosis / contraceptive / lab / dx-study / procedure).
-- We surface ALL such resources so the user can see exactly what drives IP membership.
-- ============================================================
ip_evidence AS (
    -- 1. Qualifying encounter (strict valueset filter, matches qualifying_encounters in 02-*-measure.sql)
    SELECT DISTINCT e.patient_id, 'qualifying_encounter' AS pathway,
           'Encounter' AS resource_type, e.id AS resource_id,
           e.type_code AS code, c.display AS code_display,
           e.period_start AS event_date, 'initial_population' AS source_cte
    FROM encounter_flat e
    JOIN initial_population ip ON ip.patient_id = e.patient_id
    JOIN concepts c ON c.system = e.type_system AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1025',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1023',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1022',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1024',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1080',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1089'
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start
        AND e.period_start <= mp.mp_end

    UNION ALL
    -- 2. Sexual-activity Assessment (LOINC 64728-9, value=373066001)
    SELECT DISTINCT o.patient_id, 'sexual_activity_assessment' AS pathway,
           'Observation' AS resource_type, o.id AS resource_id,
           o.code, 'Sexually active assessment' AS code_display,
           o.effective_start AS event_date, 'initial_population' AS source_cte
    FROM observation_flat o
    JOIN initial_population ip ON ip.patient_id = o.patient_id
    CROSS JOIN mp
    WHERE o.code = '64728-9' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= mp.mp_end

    UNION ALL
    -- 3. Sexual-activity Diagnosis (3 valuesets)
    SELECT DISTINCT c.patient_id, 'sexual_activity_diagnosis' AS pathway,
           'Condition' AS resource_type, c.id AS resource_id,
           c.code, vs.display AS code_display,
           c.onset_date AS event_date, 'initial_population' AS source_cte
    FROM condition_flat c
    JOIN initial_population ip ON ip.patient_id = c.patient_id
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1018',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.120.12.1003',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1012'
        )
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.mp_end
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.mp_start)

    UNION ALL
    -- 4. Active Contraceptive MedicationRequest (overlapping MP)
    SELECT DISTINCT mr.patient_id, 'sexual_activity_active_contraceptive' AS pathway,
           'MedicationRequest' AS resource_type, mr.id AS resource_id,
           mr.med_code AS code, vs.display AS code_display,
           COALESCE(mr.validity_start, mr.authored_on) AS event_date, 'initial_population' AS source_cte
    FROM medicationrequest_flat mr
    JOIN initial_population ip ON ip.patient_id = mr.patient_id
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1080'
    CROSS JOIN mp
    WHERE mr.status = 'active'
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND COALESCE(mr.validity_start, mr.authored_on) <= mp.mp_end
        AND COALESCE(mr.validity_end, mr.authored_on) >= mp.mp_start

    UNION ALL
    -- 5. Ordered Contraceptive MedicationRequest (authoredOn during MP)
    SELECT DISTINCT mr.patient_id, 'sexual_activity_ordered_contraceptive' AS pathway,
           'MedicationRequest' AS resource_type, mr.id AS resource_id,
           mr.med_code AS code, vs.display AS code_display,
           mr.authored_on AS event_date, 'initial_population' AS source_cte
    FROM medicationrequest_flat mr
    JOIN initial_population ip ON ip.patient_id = mr.patient_id
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1080'
    CROSS JOIN mp
    WHERE mr.status IN ('active', 'completed')
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND mr.authored_on >= mp.mp_start AND mr.authored_on <= mp.mp_end

    UNION ALL
    -- 6. Lab tests indicating sexual activity (ServiceRequest, 4 valuesets)
    SELECT DISTINCT sr.patient_id, 'sexual_activity_lab_test' AS pathway,
           'ServiceRequest' AS resource_type, sr.id AS resource_id,
           sr.code, vs.display AS code_display,
           sr.authored_on AS event_date, 'initial_population' AS source_cte
    FROM servicerequest_flat sr
    JOIN initial_population ip ON ip.patient_id = sr.patient_id
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1011',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.108.12.1017',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1007',
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1051'
        )
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end

    UNION ALL
    -- 7. Diagnostic studies during pregnancy (ServiceRequest)
    SELECT DISTINCT sr.patient_id, 'sexual_activity_diagnostic_study' AS pathway,
           'ServiceRequest' AS resource_type, sr.id AS resource_id,
           sr.code, vs.display AS code_display,
           sr.authored_on AS event_date, 'initial_population' AS source_cte
    FROM servicerequest_flat sr
    JOIN initial_population ip ON ip.patient_id = sr.patient_id
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1008'
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.mp_start AND sr.authored_on <= mp.mp_end

    UNION ALL
    -- 8. Procedures indicating sexual activity
    SELECT DISTINCT pr.patient_id, 'sexual_activity_procedure' AS pathway,
           'Procedure' AS resource_type, pr.id AS resource_id,
           pr.code, vs.display AS code_display,
           pr.performed_start AS event_date, 'initial_population' AS source_cte
    FROM procedure_flat pr
    JOIN initial_population ip ON ip.patient_id = pr.patient_id
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.111.12.1017'
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start >= mp.mp_start
        AND pr.performed_start <= mp.mp_end
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
