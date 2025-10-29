# Aidbox Adaptive Forms - PHQ-2/PHQ-9 Server

A NestJS-based FHIR SDC Adaptive Questionnaire server that implements the PHQ-2/PHQ-9 depression screening workflow.

## Overview

This server implements the adaptive questionnaire pattern where:
1. Patient starts with PHQ-2 (2 questions)
2. Server calculates the PHQ-2 score
3. If score > 2, the server returns PHQ-9 (9 questions) for further assessment
4. If score <= 2, the assessment is complete

## Quick Start with Docker Compose

The easiest way to run the entire stack (Aidbox + Adaptive Forms Server) with pre-loaded questionnaires:

```bash
docker-compose up -d
```

This will start:
- **Aidbox** at http://localhost:8888 (admin/password)
- **Adaptive Forms Server** at http://localhost:3000
- **PostgreSQL** database
- **Pre-loaded PHQ-2 Questionnaire** (via init-bundle)

Wait 30-60 seconds for services to initialize, then verify the questionnaire was loaded:

```bash
curl -u basic:secret http://localhost:8888/fhir/Questionnaire/phq-2
```

To stop:
```bash
docker-compose down
```

## FHIR SDC Compliance

This implementation follows the FHIR SDC (Structured Data Capture) Adaptive Questionnaire specification:
- Implements `$next-question` operation
- Accepts QuestionnaireResponse
- Returns next Questionnaire based on adaptive logic
- Uses standard LOINC codes for answers
