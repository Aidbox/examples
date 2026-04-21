-- CMS149 Dementia Cognitive Assessment — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS149FHIRDementiaCognitiveAssess v1.0.000
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql
-- IMPORTANT: Uses timestamptz for MP boundaries to handle Aidbox date storage
--
-- NOTE: This measure uses Denominator EXCEPTION (not Exclusion).
--       No shared exclusions (hospice, palliative, frailty) apply.

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- exists "Dementia Encounter During Measurement Period"
--   AND Count("Qualifying Encounter During Measurement Period") >= 2
-- ============================================================

-- Encounter to Assess Cognition: 9 encounter types, finished, period during MP
encounter_to_assess_cognition AS (
    SELECT DISTINCT e.id AS encounter_id, e.patient_id, e.period_start, e.period_end
    FROM encounter_flat e
    JOIN concepts c
        ON c.system = e.type_system
        AND c.code = e.type_code
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1492',  -- PsychVisitDiagnosticEvaluation
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1012',  -- NursingFacilityVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1014',  -- CareServicesInLongTermResidentialFacility
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1016',  -- HomeHealthcareServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1496',  -- PsychVisitPsychotherapy
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1023',  -- BehavioralOrNeuropsychAssessment
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1011',  -- OccupationalTherapyEvaluation
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',  -- OfficeVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1008'   -- OutpatientConsultation
        )
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start >= mp.mp_start
        AND e.period_start <= mp.mp_end
        -- "period during day of MP" requires both start AND end within MP
        AND e.period_end IS NOT NULL
        AND e.period_end <= mp.mp_end
),

-- Dementia Encounter: encounter_to_assess_cognition WITH dementia condition
-- Condition must: overlap encounter period, not abated before end of MP, be verified
-- prevalenceInterval() returns valid (closed-null-bound) interval ONLY for active/recurrence/relapse;
-- for inactive/null clinicalStatus with null abatement, interval has open-null bound → overlap is unknown → false
dementia_encounter AS (
    SELECT DISTINCT eac.encounter_id, eac.patient_id, eac.period_start, eac.period_end
    FROM encounter_to_assess_cognition eac
    JOIN condition_flat cond
        ON cond.patient_id = eac.patient_id
    JOIN concepts vs
        ON vs.system = cond.code_system
        AND vs.code = cond.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1005'  -- DementiaAndMentalDegenerations
    CROSS JOIN mp
    WHERE -- prevalenceInterval: active/recurrence/relapse always produce valid overlap;
        -- non-active with null abatement produces open-null-bound interval → overlap unknown → false
        (cond.clinical_status IN ('active', 'recurrence', 'relapse')
            OR cond.abatement_date IS NOT NULL)
        -- prevalenceInterval overlaps encounter period
        AND cond.onset_date <= eac.period_end
        AND (cond.abatement_date IS NULL OR cond.abatement_date >= eac.period_start)
        -- abatement is null OR ends after end of MP
        AND (cond.abatement_date IS NULL OR cond.abatement_date > mp.mp_end)
        -- isVerified
        AND (cond.verification_status IS NULL
            OR cond.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
),

-- Qualifying encounters: encounter_to_assess_cognition UNION Patient Provider Interaction
-- Count >= 2 per patient
qualifying_encounter_count AS (
    SELECT patient_id
    FROM (
        SELECT encounter_id, patient_id FROM encounter_to_assess_cognition
        UNION
        SELECT e.id AS encounter_id, e.patient_id
        FROM encounter_flat e
        JOIN concepts c
            ON c.system = e.type_system
            AND c.code = e.type_code
            AND c.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1012'  -- PatientProviderInteraction
        CROSS JOIN mp
        WHERE e.status = 'finished'
            AND e.period_start >= mp.mp_start
            AND e.period_start <= mp.mp_end
            AND e.period_end IS NOT NULL
            AND e.period_end <= mp.mp_end
    ) all_qualifying
    GROUP BY patient_id
    HAVING COUNT(DISTINCT encounter_id) >= 2
),

initial_population AS (
    SELECT DISTINCT de.patient_id
    FROM dementia_encounter de
    WHERE de.patient_id IN (SELECT patient_id FROM qualifying_encounter_count)
),


-- ============================================================
-- 3. DENOMINATOR EXCEPTION (not exclusion)
-- ObservationCancelled with Patient Reason, issued during dementia encounter
-- ============================================================
denominator_exclusion AS (
    SELECT DISTINCT o.resource->'subject'->>'id' AS patient_id
    FROM observation o
    CROSS JOIN mp
    JOIN dementia_encounter de
        ON de.patient_id = o.resource->'subject'->>'id'
    WHERE o.resource->>'status' = 'cancelled'
        -- code in Standardized Tools for Assessment of Cognition OR Cognitive Assessment
        AND EXISTS (
            SELECT 1 FROM concepts vs
            WHERE vs.system = o.resource->'code'->'coding'->0->>'system'
                AND vs.code = o.resource->'code'->'coding'->0->>'code'
                AND vs.valueset_url IN (
                    'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1006',  -- StandardizedToolsForAssessmentOfCognition
                    'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1332'   -- CognitiveAssessment
                )
        )
        -- issued during dementia encounter period
        AND (o.resource->>'issued')::timestamptz >= de.period_start
        AND (o.resource->>'issued')::timestamptz <= de.period_end
        -- notDoneReason in Patient Reason
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(o.resource->'extension') ext
            JOIN concepts pr
                ON pr.system = ext->'value'->'CodeableConcept'->'coding'->0->>'system'
                AND pr.code = ext->'value'->'CodeableConcept'->'coding'->0->>'code'
                AND pr.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1008'  -- PatientReason
            WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
        )
),

-- ============================================================
-- 4. NUMERATOR
-- Assessment of Cognition Using Standardized Tools or Alternate Methods
-- Observation with value, status final/amended/corrected,
-- effective starts within 12 months before end of dementia encounter
-- ============================================================
numerator AS (
    SELECT DISTINCT o.patient_id
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
        -- effective starts 12 months or less on or before end of encounter
        AND o.effective_start <= de.period_end
        AND o.effective_start >= (de.period_end - INTERVAL '12 months')
),

-- ============================================================
-- 5. MEASURE REPORT
-- NOTE: This measure uses denominator EXCEPTION (not exclusion).
-- Exception applies ONLY if patient is NOT in numerator.
-- If patient is in both exception AND numerator, they stay in denominator as a success.
-- ============================================================
measure_results AS (
    SELECT
        p.patient_id,
        1 AS in_initial_population,
        1 AS in_denominator,
        CASE WHEN de.patient_id IS NOT NULL AND n.patient_id IS NULL THEN 1 ELSE 0 END AS in_exclusion,
        CASE WHEN n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS in_numerator
    FROM initial_population p
    LEFT JOIN denominator_exclusion de ON de.patient_id = p.patient_id
    LEFT JOIN numerator n ON n.patient_id = p.patient_id
)

-- ============================================================
-- OUTPUT: Summary MeasureReport
-- ============================================================
SELECT
    COUNT(*) AS initial_population,
    COUNT(*) AS denominator,
    SUM(in_exclusion) AS denominator_exclusion,
    SUM(in_numerator) AS numerator,
    COUNT(*) - SUM(in_exclusion) AS denominator_minus_exclusion,
    CASE
        WHEN COUNT(*) - SUM(in_exclusion) > 0
        THEN ROUND(SUM(in_numerator)::numeric / (COUNT(*) - SUM(in_exclusion)), 4)
        ELSE 0
    END AS measure_score
FROM measure_results;
