-- Shared Terminology: ValueSet concepts as a flat SoF table + wrapper view
--
-- sof.concept is the manually-materialized form of the `concept` ViewDefinition
-- (measures/shared/viewdefinitions/concept.json). Aidbox stores ValueSet resources
-- only in the far registry (far.valueset) — the SoF engine sees zero stored
-- ValueSets — so $materialize cannot populate this view yet. load_measure.py
-- (per-measure, incremental) and refresh_sof.py (full rebuild) implement the
-- flatten from far.valueset instead. When Aidbox ships native materialization of
-- canonical resources, those flattens are replaced by one $materialize call with
-- no schema change.
--
-- The public `concepts` view is the stable join surface for all measure SQL
-- (same wrapper pattern as sof.patient_flat -> patient_flat).
--
-- Usage: JOIN concepts c ON c.code = p.code AND c.system = p.code_system
--        WHERE c.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/...'

CREATE SCHEMA IF NOT EXISTS sof;

-- Migration: `concepts` used to be a public TABLE; now it is a view over
-- sof.concept. Drop whichever legacy relation is present (data is derived —
-- rebuilt from far.valueset by the loaders).
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = 'concepts') THEN
        EXECUTE 'DROP VIEW concepts';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'concepts') THEN
        EXECUTE 'DROP TABLE concepts CASCADE';
    END IF;
END $$;

DROP TABLE IF EXISTS sof.concept;

CREATE TABLE sof.concept (
    valueset_url  TEXT NOT NULL,
    valueset_name TEXT NOT NULL,
    system        TEXT NOT NULL,
    code          TEXT NOT NULL,
    display       TEXT
);

-- Unique constraint prevents row multiplication from duplicate inserts (and
-- collapses duplicate package versions of the same valueset url).
-- Enables INSERT ... ON CONFLICT DO NOTHING for idempotent loading.
-- Also serves as the primary lookup index for (valueset_url, system, code).
CREATE UNIQUE INDEX idx_concept_unique ON sof.concept (valueset_url, system, code);

-- Lookup by name (used in some evidence queries)
CREATE INDEX idx_concept_vs_name ON sof.concept (valueset_name, system, code);

CREATE VIEW concepts AS SELECT * FROM sof.concept;
