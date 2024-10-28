# Aidbox Forms Smart App Launch

This example application demonstrates SMART on FHIR integration with the Aidbox Forms using a React frontend.

It provides two distinct launch scenarios: 
 * practitioner launch from a Provider EHR
 * patient launch from a Patient Portal.

Questionnaires are sourced from Aidbox Forms Public Builder, a read-only FHIR server used to retrieve questionnaires and execute the populate operation for generating QuestionnaireResponses. While the questionnaires themselves are fetched from this read-only server, all other FHIR resources, including the generated QuestionnaireResponses, are managed (read and write) via SMART on FHIR API.

[Demo](https://aidbox.github.io/examples/aidbox-forms-smart-launch/)

## How to run
1. Clone the repository
2. Install dependencies: `npm install`
3. Run the application: `npm run dev`
