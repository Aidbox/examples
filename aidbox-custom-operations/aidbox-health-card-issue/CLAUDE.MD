# Project Overview

This project implements the **`$health-cards-issue` FHIR operation** in TypeScript, providing SMART Health Cards generation for patient health data. The implementation uses Aidbox as the FHIR server and a Node.js TypeScript application for health card processing and cryptographic signing. The implementation should be minimal and focused on core functionality.

## Architecture

- **FHIR Server**: Aidbox with custom operation routing
- **Application**: Node.js TypeScript backend service
- **Integration**: Bidirectional communication via FHIR API and Aidbox Apps
- **Output**: Cryptographically signed SMART Health Cards (JWS format)

## Key Resources

### FHIR Operation Specification
- **Operation**: `$health-cards-issue`
- **Specification**: [SMART Health Cards IG](https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/OperationDefinition-patient-i-health-cards-issue.html)
- **Scope**: Patient-level operation for health card issuance

### Aidbox Integration
- **Init Bundle**: Uses [Aidbox init bundles](https://docs.aidbox.app/configuration/init-bundle) for configuration
- **App Resource**: Implements custom endpoints via [Aidbox Apps](https://docs.aidbox.app/app-development/aidbox-sdk/apps)
- **Reference Implementation**: See `../aws-s3-aidbox-integration` for TypeScript app patterns

## Development Commands

```bash
# Start Aidbox and application
docker-compose up

# Development mode with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Build production
npm run build

```

## Project Scope

- **Backend only**: No frontend UI required
- **Core functionality**: Health card generation and signing
- **FHIR compliance**: Follows SMART Health Cards specifications
- **Docker deployment**: Containerized for easy deployment
