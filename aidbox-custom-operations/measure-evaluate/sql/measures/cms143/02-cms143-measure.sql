-- CMS143 Primary Open-Angle Glaucoma (POAG): Optic Nerve Evaluation — Full Measure as SQL
-- Measurement Period: 2026-01-01 to 2026-12-31
-- Translates CQL logic from CMS143FHIRPOAGOpticNerveEval v1.0.000
--
-- Key patterns:
--   - Age at START of MP (not end)
--   - Encounter class != 'VR' (virtual)
--   - POAG diagnosis overlapping encounter period
--   - Numerator: observations during POAG encounter period (not just MP)
--   - Denominator EXCEPTION (not exclusion): ObservationCancelled with notDoneReason extension
--
-- Prerequisites: shared/sql/00-terminology.sql, shared/sql/01-views.sql

WITH mp AS (
    SELECT
        '2026-01-01T00:00:00Z'::timestamptz AS mp_start,
        '2026-12-31T23:59:59Z'::timestamptz AS mp_end
),

-- ============================================================
-- 1. INITIAL POPULATION
-- Age >= 18 at START of MP AND POAG encounter during MP
-- ============================================================

-- Qualifying encounters: 5 types, finished, during MP, NOT virtual
-- Uses jsonb_array_elements to match ANY coding in encounter type (not just first)
qualifying_encounters AS (
    SELECT DISTINCT
        r.resource->'subject'->>'id' AS patient_id,
        r.id AS encounter_id,
        (r.resource->'period'->>'start')::timestamptz AS period_start,
        (r.resource->'period'->>'end')::timestamptz AS period_end
    FROM encounter r
    CROSS JOIN mp
    CROSS JOIN LATERAL jsonb_array_elements(r.resource->'type') AS t
    CROSS JOIN LATERAL jsonb_array_elements(t->'coding') AS coding
    JOIN concepts c
        ON c.system = coding->>'system'
        AND c.code = coding->>'code'
        AND c.valueset_url IN (
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1001',  -- OfficeVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1285',             -- OphthalmologicalServices
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1008',   -- OutpatientConsultation
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1012',   -- NursingFacilityVisit
            'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1014'    -- CareServicesInLongTermResidentialFacility
        )
    WHERE r.resource->>'status' = 'finished'
        AND (r.resource->'period'->>'start')::timestamptz >= mp.mp_start
        -- "during day of MP" = entire period contained; open-ended encounters excluded
        AND (r.resource->'period'->>'end') IS NOT NULL
        AND (r.resource->'period'->>'end')::timestamptz <= mp.mp_end
        AND COALESCE(r.resource->'class'->>'code', '') != 'VR'
),

-- POAG encounters: qualifying encounter WITH overlapping POAG diagnosis
poag_encounters AS (
    SELECT DISTINCT qe.patient_id, qe.encounter_id, qe.period_start, qe.period_end
    FROM qualifying_encounters qe
    JOIN condition_flat c ON c.patient_id = qe.patient_id
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.326'  -- PrimaryOpenAngleGlaucoma
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        -- prevalenceInterval overlaps encounter period
        -- Per CQL QICoreCommon.prevalenceInterval():
        --   active/recurrence/relapse: Interval[onset, abatement] (null abatement = open-ended)
        --   inactive/resolved/remission: Interval[onset, abatement) (null abatement = null end → overlaps returns null → false)
        AND c.onset_date <= COALESCE(qe.period_end, qe.period_start)
        AND (
            -- Active conditions: null abatement means open-ended (overlaps everything)
            (c.clinical_status IN ('active', 'recurrence', 'relapse') AND (c.abatement_date IS NULL OR c.abatement_date >= qe.period_start))
            -- Inactive/resolved: null abatement means unknown end → cannot determine overlap → exclude
            OR (c.clinical_status NOT IN ('active', 'recurrence', 'relapse') AND c.abatement_date IS NOT NULL AND c.abatement_date >= qe.period_start)
            -- No clinical status: treat as active (null abatement = open-ended)
            OR (c.clinical_status IS NULL AND (c.abatement_date IS NULL OR c.abatement_date >= qe.period_start))
        )
),

initial_population AS (
    SELECT DISTINCT p.id AS patient_id
    FROM patient_flat p
    CROSS JOIN mp
    WHERE EXTRACT(YEAR FROM AGE(mp.mp_start, p.birth_date::date)) >= 18
        AND p.id IN (SELECT patient_id FROM poag_encounters)
),


-- ============================================================
-- 3. DENOMINATOR EXCEPTIONS
-- Medical reason for not performing Cup to Disc Ratio or Optic Disc Exam
-- Uses ObservationCancelled: status='cancelled' with qicore-notDoneReason extension
-- ============================================================

-- Cup to Disc Ratio not performed with medical reason, during POAG encounter
medical_reason_cup_to_disc AS (
    SELECT DISTINCT o.resource#>>'{subject,id}' AS patient_id
    FROM observation o
    JOIN concepts vs ON vs.system = o.resource->'code'->'coding'->0->>'system'
        AND vs.code = o.resource->'code'->'coding'->0->>'code'
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1333'  -- CupToDiscRatio
    WHERE o.resource->>'status' = 'cancelled'
        -- notDoneReason in Medical Reason valueset (via extension)
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(o.resource->'extension') ext
            WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
                AND EXISTS (
                    SELECT 1 FROM concepts mr
                    WHERE mr.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1007'  -- MedicalReason
                        AND mr.code = ext->'value'->'CodeableConcept'->'coding'->0->>'code'
                        AND mr.system = ext->'value'->'CodeableConcept'->'coding'->0->>'system'
                )
        )
        -- issued during a POAG encounter period
        AND EXISTS (
            SELECT 1 FROM poag_encounters pe
            WHERE pe.patient_id = o.resource#>>'{subject,id}'
                AND (o.resource->>'issued')::date >= pe.period_start::date
                AND (o.resource->>'issued')::date <= COALESCE(pe.period_end, pe.period_start)::date
        )
),

-- Optic Disc Exam not performed with medical reason, during POAG encounter
medical_reason_optic_disc AS (
    SELECT DISTINCT o.resource#>>'{subject,id}' AS patient_id
    FROM observation o
    JOIN concepts vs ON vs.system = o.resource->'code'->'coding'->0->>'system'
        AND vs.code = o.resource->'code'->'coding'->0->>'code'
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1334'  -- OpticDiscExamForStructuralAbnormalities
    WHERE o.resource->>'status' = 'cancelled'
        AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(o.resource->'extension') ext
            WHERE ext->>'url' = 'http://hl7.org/fhir/us/qicore/StructureDefinition/qicore-notDoneReason'
                AND EXISTS (
                    SELECT 1 FROM concepts mr
                    WHERE mr.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1007'
                        AND mr.code = ext->'value'->'CodeableConcept'->'coding'->0->>'code'
                        AND mr.system = ext->'value'->'CodeableConcept'->'coding'->0->>'system'
                )
        )
        AND EXISTS (
            SELECT 1 FROM poag_encounters pe
            WHERE pe.patient_id = o.resource#>>'{subject,id}'
                AND (o.resource->>'issued')::date >= pe.period_start::date
                AND (o.resource->>'issued')::date <= COALESCE(pe.period_end, pe.period_start)::date
        )
),

denominator_exclusion AS (
    SELECT patient_id FROM medical_reason_cup_to_disc
    WHERE patient_id IN (SELECT patient_id FROM initial_population)
    UNION SELECT patient_id FROM medical_reason_optic_disc
    WHERE patient_id IN (SELECT patient_id FROM initial_population)
),

-- ============================================================
-- 4. NUMERATOR
-- Cup to Disc Ratio AND Optic Disc Exam, both with value,
-- during a POAG encounter period
-- ============================================================

-- Cup to Disc Ratio performed with result, during POAG encounter
cup_to_disc AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1333'  -- CupToDiscRatio
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND EXISTS (
            SELECT 1 FROM poag_encounters pe
            WHERE pe.patient_id = o.patient_id
                AND o.effective_start >= pe.period_start
                AND o.effective_start <= COALESCE(pe.period_end, pe.period_start)
        )
),

-- Optic Disc Exam performed with result, during POAG encounter
optic_disc_exam AS (
    SELECT DISTINCT o.patient_id
    FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1334'  -- OpticDiscExamForStructuralAbnormalities
    WHERE o.status IN ('final', 'amended', 'corrected')
        AND o.has_value = true
        AND EXISTS (
            SELECT 1 FROM poag_encounters pe
            WHERE pe.patient_id = o.patient_id
                AND o.effective_start >= pe.period_start
                AND o.effective_start <= COALESCE(pe.period_end, pe.period_start)
        )
),

-- Numerator = both cup-to-disc AND optic disc exam
numerator AS (
    SELECT patient_id FROM cup_to_disc
    INTERSECT SELECT patient_id FROM optic_disc_exam
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
