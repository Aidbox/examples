-- Shared exclusion logic as standalone parameterized SQL, one query per exclusion.
--
-- Source of truth for the SQLQuery Library transport (build_sqlquery_libraries.py
-- turns each block into a FHIR Library on the SQLQuery profile). Each block is the
-- inlined equivalent of a shared_* PL/pgSQL function from 02-shared-exclusions.sql,
-- rewritten so it:
--   * takes the measurement period via :period_start / :period_end (declared params)
--     built into an `mp` CTE, instead of function args p_mp_start/p_mp_end
--   * reads only the flat wrapper views + `concepts` (which map to depends-on
--     ViewDefinitions) — no calls to other functions or SQLQueries, so every
--     exclusion is a single-level SQLQuery (measure -> exclusion -> ViewDefinition)
--   * has NO p_subject push-down (population mode only; the SQLQuery transport does
--     not thread a per-patient filter through depends-on CTEs)
--
-- Block delimiter: a line `-- @@ <name>` starts a named block; the SQL until the next
-- delimiter (or EOF) is that exclusion's body. <name> is also the CTE label the
-- measure references (hospice, palliative, advanced_illness_frailty, nursing_home).
--
-- Each body begins with `, mp AS (...)` — a leading CTE continuation, because Aidbox
-- prepends `WITH <dep> AS (...)` for the depends-on ViewDefinitions (see lessons-learned
-- "Measures as SQL-on-FHIR SQLQuery Libraries"). Verified byte-for-byte against the
-- shared_* functions by verify_sqlquery_parity.py.

-- @@ hospice
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
SELECT DISTINCT patient_id FROM (
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN encounter r ON r.id = e.id
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.666.5.307'
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_end <= mp.e AND e.period_end >= mp.s
        AND (r.resource->'hospitalization'->'dischargeDisposition'->'coding'->0->>'code'
            IN ('428361000124107', '428371000124100'))
    UNION ALL
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1003'
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start <= mp.e
        AND (e.period_end IS NULL OR e.period_end >= mp.s)
    UNION ALL
    SELECT o.patient_id
    FROM observation_flat o CROSS JOIN mp
    WHERE o.code = '45755-6' AND o.code_system = 'http://loinc.org'
        AND o.value_code = '373066001'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= mp.e
        AND (o.effective_end IS NULL OR o.effective_end >= mp.s)
    UNION ALL
    SELECT sr.patient_id
    FROM servicerequest_flat sr
    JOIN concepts vs ON vs.system = sr.code_system AND vs.code = sr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'
    CROSS JOIN mp
    WHERE sr.status IN ('active', 'completed')
        AND sr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND sr.authored_on >= mp.s AND sr.authored_on <= mp.e
    UNION ALL
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start <= mp.e
        AND (pr.performed_end IS NULL OR pr.performed_end >= mp.s)
    UNION ALL
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1165'
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.e
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.s)
) sub

-- @@ palliative
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
SELECT DISTINCT patient_id FROM (
    SELECT o.patient_id
    FROM observation_flat o CROSS JOIN mp
    WHERE o.code = '71007-9' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_start <= mp.e
        AND (o.effective_end IS NULL OR o.effective_end >= mp.s)
    UNION ALL
    SELECT c.patient_id
    FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1167'
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.e
        AND (c.abatement_date IS NULL OR c.abatement_date >= mp.s)
    UNION ALL
    SELECT e.patient_id
    FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1090'
    CROSS JOIN mp
    WHERE e.status = 'finished'
        AND e.period_start <= mp.e
        AND (e.period_end IS NULL OR e.period_end >= mp.s)
    UNION ALL
    SELECT pr.patient_id
    FROM procedure_flat pr
    JOIN concepts vs ON vs.system = pr.code_system AND vs.code = pr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.198.12.1135'
    CROSS JOIN mp
    WHERE pr.status = 'completed'
        AND pr.performed_start <= mp.e
        AND (pr.performed_end IS NULL OR pr.performed_end >= mp.s)
) sub

-- @@ nursing_home
, mp AS (SELECT ((:period_end)::text || 'T23:59:59Z')::timestamptz AS e)
SELECT o.patient_id
FROM observation_flat o
JOIN patient_flat p ON p.id = o.patient_id
CROSS JOIN mp
WHERE EXTRACT(YEAR FROM AGE(mp.e, p.birth_date::date)) >= 66
    AND o.code = '71802-3' AND o.code_system = 'http://loinc.org'
    AND o.value_code = '160734000'
    AND o.status IN ('final', 'amended', 'corrected')
    AND o.effective_end <= mp.e

-- @@ advanced_illness_frailty
-- Inlined composition of has_frailty + advanced_illness + dementia_meds (age >= 66).
-- The three sub-parts are inline CTEs here (NOT separate SQLQueries) to stay single-level.
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
, has_frailty AS (
    SELECT DISTINCT patient_id FROM (
        SELECT dr.patient_id FROM devicerequest_flat dr
        JOIN concepts vs ON vs.system = dr.code_system AND vs.code = dr.code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'
        CROSS JOIN mp
        WHERE dr.status IN ('active', 'completed')
            AND dr.authored_on >= mp.s AND dr.authored_on <= mp.e
        UNION ALL
        SELECT c.patient_id FROM condition_flat c
        JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1074'
        CROSS JOIN mp
        WHERE (c.verification_status IS NULL
            OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
            AND c.onset_date <= mp.e AND (c.abatement_date IS NULL OR c.abatement_date >= mp.s)
        UNION ALL
        SELECT e.patient_id FROM encounter_flat e
        JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1088'
        CROSS JOIN mp
        WHERE e.status = 'finished' AND e.period_start <= mp.e
            AND (e.period_end IS NULL OR e.period_end >= mp.s)
        UNION ALL
        SELECT o.patient_id FROM observation_flat o
        JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1075'
        CROSS JOIN mp
        WHERE o.status IN ('preliminary', 'final', 'amended', 'corrected')
            AND o.effective_start <= mp.e AND (o.effective_end IS NULL OR o.effective_end >= mp.s)
        UNION ALL
        SELECT o.patient_id FROM observation_flat o
        JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
            AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'
        CROSS JOIN mp
        WHERE o.code = '98181-1' AND o.code_system = 'http://loinc.org'
            AND o.status IN ('final', 'amended', 'corrected')
            AND o.effective_end >= mp.s AND o.effective_end <= mp.e
    ) f
)
, advanced_illness AS (
    SELECT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082'
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date >= (mp.s - INTERVAL '1 year') AND c.onset_date <= mp.e
)
, dementia_meds AS (
    SELECT mr.patient_id FROM medicationrequest_flat mr
    JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1510'
    CROSS JOIN mp
    WHERE mr.status = 'active'
        AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
        AND COALESCE(mr.validity_start, mr.authored_on) <= mp.e
        AND COALESCE(mr.validity_end, mr.authored_on) >= (mp.s - INTERVAL '1 year')
)
SELECT p.id AS patient_id
FROM patient_flat p
JOIN has_frailty f ON f.patient_id = p.id
LEFT JOIN advanced_illness ai ON ai.patient_id = p.id
LEFT JOIN dementia_meds dm ON dm.patient_id = p.id
CROSS JOIN mp
WHERE EXTRACT(YEAR FROM AGE(mp.e, p.birth_date::date)) >= 66
    AND (ai.patient_id IS NOT NULL OR dm.patient_id IS NOT NULL)

-- @@ advanced_illness
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
SELECT c.patient_id
FROM condition_flat c
JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
    AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.110.12.1082'
CROSS JOIN mp
WHERE (c.verification_status IS NULL
    OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
    AND c.onset_date >= (mp.s - INTERVAL '1 year') AND c.onset_date <= mp.e

-- @@ dementia_meds
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
SELECT mr.patient_id
FROM medicationrequest_flat mr
JOIN concepts vs ON vs.system = mr.med_system AND vs.code = mr.med_code
    AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.196.12.1510'
CROSS JOIN mp
WHERE mr.status = 'active'
    AND mr.intent IN ('order', 'original-order', 'reflex-order', 'filler-order', 'instance-order')
    AND COALESCE(mr.validity_start, mr.authored_on) <= mp.e
    AND COALESCE(mr.validity_end, mr.authored_on) >= (mp.s - INTERVAL '1 year')

-- @@ has_frailty
, mp AS (SELECT ((:period_start)::text || 'T00:00:00Z')::timestamptz AS s,
                ((:period_end)::text   || 'T23:59:59Z')::timestamptz AS e)
SELECT DISTINCT patient_id FROM (
    SELECT dr.patient_id FROM devicerequest_flat dr
    JOIN concepts vs ON vs.system = dr.code_system AND vs.code = dr.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'
    CROSS JOIN mp
    WHERE dr.status IN ('active', 'completed') AND dr.authored_on >= mp.s AND dr.authored_on <= mp.e
    UNION ALL
    SELECT c.patient_id FROM condition_flat c
    JOIN concepts vs ON vs.system = c.code_system AND vs.code = c.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1074'
    CROSS JOIN mp
    WHERE (c.verification_status IS NULL
        OR c.verification_status IN ('confirmed', 'unconfirmed', 'provisional', 'differential'))
        AND c.onset_date <= mp.e AND (c.abatement_date IS NULL OR c.abatement_date >= mp.s)
    UNION ALL
    SELECT e.patient_id FROM encounter_flat e
    JOIN concepts vs ON vs.system = e.type_system AND vs.code = e.type_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.101.12.1088'
    CROSS JOIN mp
    WHERE e.status = 'finished' AND e.period_start <= mp.e
        AND (e.period_end IS NULL OR e.period_end >= mp.s)
    UNION ALL
    SELECT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.code_system AND vs.code = o.code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.113.12.1075'
    CROSS JOIN mp
    WHERE o.status IN ('preliminary', 'final', 'amended', 'corrected')
        AND o.effective_start <= mp.e AND (o.effective_end IS NULL OR o.effective_end >= mp.s)
    UNION ALL
    SELECT o.patient_id FROM observation_flat o
    JOIN concepts vs ON vs.system = o.value_system AND vs.code = o.value_code
        AND vs.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.118.12.1300'
    CROSS JOIN mp
    WHERE o.code = '98181-1' AND o.code_system = 'http://loinc.org'
        AND o.status IN ('final', 'amended', 'corrected')
        AND o.effective_end >= mp.s AND o.effective_end <= mp.e
) f
