-- Shared Terminology: ValueSet concepts as a flat table
-- Used by all measures. Each measure adds its valuesets via INSERT.
--
-- Usage: JOIN concepts c ON c.code = p.code AND c.system = p.code_system
--        WHERE c.valueset_url = 'http://cts.nlm.nih.gov/fhir/ValueSet/...'

DROP TABLE IF EXISTS concepts;

CREATE TABLE concepts (
    valueset_url  TEXT NOT NULL,
    valueset_name TEXT NOT NULL,
    system        TEXT NOT NULL,
    code          TEXT NOT NULL,
    display       TEXT
);

-- Unique constraint prevents row multiplication from duplicate inserts.
-- Enables INSERT ... ON CONFLICT DO NOTHING for idempotent loading.
-- Also serves as the primary lookup index for (valueset_url, system, code).
CREATE UNIQUE INDEX idx_concepts_unique ON concepts (valueset_url, system, code);

-- Lookup by name (used in some evidence queries)
CREATE INDEX idx_concepts_vs_name ON concepts (valueset_name, system, code);
