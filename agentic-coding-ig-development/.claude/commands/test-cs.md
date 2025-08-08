# Test CodeSystem

You are working with a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY

## Task
Test and validate FHIR CodeSystem #$ARGUMENTS resource in this project.

## Available Resources

- CodeSystem MD files are in `src/CS/` directory
- Generated FHIR resources in `target/` directory - the generated JSON we need to test is target /$ARGUMENTS.json

## FHIR Server
- Aidbox FHIR Server available at http://localhost:8080/fhir
- Start if not started already with: `docker-compose up -d`

## Instructions
1. Examine the CodeSystem structure
2. Validate FHIR compliance
3. Test against the local FHIR server:
- Check if there's existing tests in /test/ folder. If there are, run them. If not, create a new test file in /test/CS/ folder.
  Test file should be a single `.http` file that does the following:
    - Create a CodeSystem resource that is used in the ValueSet using the Aidbox FHIR Server PUT API passing the Id of the codesystem: PUT /CodeSystem/$ARGUMENTS
    use JSON with CodeSystem resource in http file using << ../../target/$ARGUMENTS.json
    - Run a couple of $lookup operations on the CodeSystem resource to check individual codes. For calling $lookup use the following pattern: http://<FHIR Server URL>/CodeSystem/$lookup?system=<codesystemURLfromJSONfile>&code=<code>
    - Delete the CodeSystem
4. Report if there are any issues found in the testing output file.


Provide concise testing results and recommendations.
