# Test ValueSet

You are working with a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY

## Task
Test and validate FHIR ValueSet #$ARGUMENTS resource in this project.

## Available Resources
- ValueSets in `src/VS/` directory
- CodeSystems in `src/CS/` directory
- Generated FHIR resources in `target/` directory - the generated JSON we need to test is target /$ARGUMENTS.json

## FHIR Server
- Aidbox FHIR Server available at http://localhost:8080/fhir
- Start if not started already with: `docker-compose up -d`

## Instructions
1. Examine the ValueSet and CodeSystem structure
2. Validate FHIR compliance
3. Test against the local FHIR server
- Check if there's existing tests in /test/ folder. If there are, run them. If not, create a new test file in /test/VS/ folder.
  Test file should be a single `.http` file that does the following:
  - Create a referenced CodeSystem resource using the Aidbox FHIR Server PUT API passing the Id of the codesystem: PUT /CodeSystem/{CodeSystemId}
    use JSON with CodeSystem resource in http file using << ../../target/$ARGUMENTS.json
  - Create a ValueSet resource using the Aidbox FHIR Server PUT API passing the Id of the codesystem: PUT /ValueSet/$ARGUMENTS
    use JSON with ValueSet resource in http file using << ../../target/$ARGUMENTS.json
  - Run $expand operation on the ValueSet Resouce
  - Run a couple of $validate-code operations on the ValueSet resource to check individual codes.
  - Delete the ValueSet and the CodeSystem
4. Report if there are any issues found in the testing output file.


Provide concise testing results and recommendations.
