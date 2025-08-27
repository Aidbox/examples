# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY, currently in early conceptual development. The project contains markdown documentation for FHIR concepts. and a docker compose for running the FHIR server.

FHIR Server should be used to test the developed FHIR resources.


## Current Architecture

### Documentation Structure
- `src/VS/` - ValueSet definitions (e.g., VSSexoBiologico for biological sex codes)
- `src/CS/` - CodeSystem definitions (e.g., CSSexoBiologico based on Chilean Table 820)
- `src/Profiles/Extensions/` - Extension definitions (e.g., SexoBiologico extension)
- `target/` - Empty directory intended for generated FHIR Canonical resources

### Rules for creating FHIR resources
- Don't use mapping element when creating StructureDefinitions.
- All the canonical resources should have a prefix in URL : `https://interoperability.testcompany.cl/`

## Development Commands

### Starting the FHIR Server

```bash
# Start all services (PostgreSQL + Aidbox)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Check if the FHIR server is running
docker-compose ps

# Stop services
docker-compose down
```

### Service Access



- **Aidbox FHIR Server**: http://localhost:8080/
  * Basic HTTP Authentication: basic:secret
- **PostgreSQL**: localhost:5432 (database: aidbox, user: aidbox)

### Testing approach

All the tests are scripts in test folder.
Each test is an .http file. For running the test you should use the following command in test/CS directory:
```bash
httpyac send -a <TEST_HILE_NAME>.http | tee "<TEST_HILE_NAME>_run$(date +%Y%m%d%H%M%S).log"
```
When creating a new test, define the variables at the beginning of the file:
@fhirServer = http://localhost:8080/fhir
@auth = Basic basic:secret

Each resource type has its own test folder.
- `test/VS/` - tests for ValueSets
- `test/CS/` - tests for CodeSystems
- etc.
When running test if there are errors - report them, but don't try to fix them immediately before reporting.
FHIR server does resource validation of incoming resources against the profile mentioned in meta.profile element of the resource.
If you want to validate the resource without creating it, you can use POST /fhir/{ResourceType}/$validate
