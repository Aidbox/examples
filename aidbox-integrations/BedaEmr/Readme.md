---
features: [beda emr, ehr integration, electronic medical record, healthcare, integration]
languages: [yaml]
---
# BedaEMR

Runs on [Aidbox FHIR platform](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo)

Clean and powerful frontend for Electronic Medical Records.

Open-source. Customizable. Leverages HL7 [FHIR](https://hl7.org/fhir/R4/) standard as a data model and [SDC IG](http://hl7.org/fhir/uv/sdc/2019May/index.html) for form management. 

## Benefits

-   Fully FHIR compatible:
    -   all app data are stored as FHIR resources
    -   any app data are available via FHIR API
-   Extremely flexible:
    -   use extensions and profiles to adjust FHIR data model
-   Fast to build forms and CRUD
    -   all forms in the app are just Questionnaire resources
-   Build the app with no-code
    -   app provides UI Questionnaire builder for creating Questionnaires

## Features

- Appointment and Encounters (visits management, scheduling)
- Electronic Medical Records
  - based on Questionnaire and QuestionnaireResponse resources
  - Questionnaire population, initial and calculated expressions
  - extraction FHIR data from QuestionnaireResponse on save
- EMR Questionnaire form builder
- HealthcareService management
- Invoice management
- Medication management
  - Warehouse management
  - Prescriptions management
- Patient medical information
- Patients management
- Practitioners management
- Role-based functionality (Admin, Receptionist, Practitioner, Patient)
- Telemedicine
- Treatment notes




Follow [link](https://github.com/beda-software/fhir-emr) for more details

