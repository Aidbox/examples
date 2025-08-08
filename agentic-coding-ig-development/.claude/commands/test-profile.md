# Test Profile

You are working with a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY

## Task
Test and validate FHIR Profile #$ARGUMENTS resource in this project.

## Available Resources
- ValueSets in `src/VS/` directory
- CodeSystems in `src/CS/` directory
- Profiles in `src/Profiles/` directory. Separate directories for extensions, resources
- Generated FHIR resources in `target/` directory - the generated JSON we need to test is target /$ARGUMENTS.json

## FHIR Server
- Aidbox FHIR Server available at http://localhost:8080/fhir
- Start if not started already with: `docker-compose up -d`

## Instructions
1. Examine the Profile structure
2. Examine all the referenced resources, like Extensions, CodeSystems, and ValueSets
3. Validate FHIR compliance
4. Test against the local FHIR server
- Check if there's existing tests in /test/ folder. If there are, run them. If not, create a new test file in /test/Profile/ folder.
  Test file should be a single `.http` file that does the following:
- Create a referenced resources using the Aidbox FHIR Server PUT API passing the Id of the resource: PUT /CodeSystem/{CodeSystemId}, PUT /ValueSet/{ValueSetId}, PUT /StructureDefinition/{StructureDefinitionId}, etc.
use JSON with CodeSystem resource in http file using << ../../target/$ARGUMENTS.json
use JSON with ValueSet resource in http file using << ../../target/$ARGUMENTS.json
use JSON with Profile resource in http file using << ../../target/$ARGUMENTS.json
- Create a profile resource using the Aidbox FHIR Server PUT API passing the Id of the profile: PUT /StructureDefinition/$ARGUMENTS
    - Create a couple of examples of the profile resource instances testing different aspects of the profile. Use PUT /{ResourceType}/{ResourceId} FHIR API for that.
    - For the required slices test that if the slice is not present, the server returns an error.
- Delete all the resources created during testing
5. Report if there are any issues found in the testing output file.

Provide concise testing results and recommendations.
