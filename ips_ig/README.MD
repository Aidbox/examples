# IPS Summary Operation

[Specification](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html)

## Prerequisites

- [Docker](https://www.docker.com/)

## STEP 1: Environment and Aidbox license

Navigate to the `[Git base]/app-examples/$summary` folder and perform the following command:
```shell
cp .env.tpl .env
```
As a result you have the `.env` file that contains default settings.

If you are hosting Aidbox on your local computer, obtain the self-hosted trial license as described in the documentation - https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker.

Update the `AIDBOX_LICENSE` in the `.env` file with the license.

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up --build
```

## Step 3: Open and log in into Aidbox instance

Opein in browser http://localhost:8888 

And loging witn login: `admin` and password: `password`


## Step 4: Load test dataset

In the Aidbox admin window, navigate to the APIs section and choose REST Console. 
Copy and paste the following snippet into the text box of the REST Console, then click Send.
This $load request loads the Synthea test data into the server.

```
POST /fhir/$load
Content-Type: text/yaml

source: 'https://storage.googleapis.com/aidbox-public/synthea/100/all.ndjson.gz'
```

Ensure that the data is loaded successfully by receiving a `Status: 201` response.

## Step 5: Load Compartment Definition

As the next step, load the _CompartmentDefinition_ using the same REST Console in the Aidbox admin. Copy and paste the following snippet and then click Send.

```
POST /fhir/CompartmentDefinition
content-type: application/json
accept: application/json

{
  "resourceType" : "CompartmentDefinition",
  "id" : "patient",
  "url" : "http://hl7.org/fhir/CompartmentDefinition/patient",
  "version" : "4.0.1",
  "name" : "Base FHIR compartment definition for Patient",
  "status" : "draft",
  "experimental" : true,
  "date" : "2019-11-01T09:29:23+11:00",
  "publisher" : "FHIR Project Team",
  "contact" : [{
    "telecom" : [{
      "system" : "url",
      "value" : "http://hl7.org/fhir"
    }]
  }],
  "description" : "There is an instance of the patient compartment for each patient resource, and the identity of the compartment is the same as the patient. When a patient is linked to another patient, all the records associated with the linked patient are in the compartment associated with the target of the link.. The set of resources associated with a particular patient",
  "code" : "Patient",
  "search" : true,
  "resource" : [
  {"code" : "Account", "param" : ["subject"]},
  {"code" : "ActivityDefinition"},
  {"code" : "AdverseEvent", "param" : ["subject"]},
  {"code" : "AllergyIntolerance", "param" : ["patient", "recorder", "asserter"]}, 
  {"code" : "Appointment", "param" : ["actor"]},
  {"code" : "AppointmentResponse", "param" : ["actor"]},
  {"code" : "AuditEvent", "param" : ["patient"]},
  {"code" : "Basic", "param" : ["patient", "author"]},
  {"code" : "Binary"},
  {"code" : "BiologicallyDerivedProduct"}, 
  {"code" : "BodyStructure", "param" : ["patient"]},
  {"code" : "Bundle"},
  {"code" : "CapabilityStatement"},
  {"code" : "CarePlan", "param" : ["patient", "performer"]},
  {"code" : "CareTeam", "param" : ["patient", "participant"]},
  {"code" : "CatalogEntry"},
  {"code" : "ChargeItem", "param" : ["subject"]},
  {"code" : "ChargeItemDefinition"},
  {"code" : "Claim", "param" : ["patient", "payee"]},
  {"code" : "ClaimResponse", "param" : ["patient"]},
  {"code" : "ClinicalImpression", "param" : ["subject"]},
  {"code" : "CodeSystem"},
  {"code" : "Communication", "param" : ["subject", "sender", "recipient"]},
  {"code" : "CommunicationRequest", "param" : ["subject", "sender", "recipient", "requester"]},
  {"code" : "CompartmentDefinition"},
  {"code" : "Composition", "param" : ["subject", "author", "attester"]},
  {"code" : "ConceptMap"},
  {"code" : "Condition", "param" : ["patient", "asserter"]},
  {"code" : "Consent", "param" : ["patient"]},
  {"code" : "Contract"},
  {"code" : "Coverage", "param" : ["policy-holder", "subscriber", "beneficiary", "payor"]},
  {"code" : "CoverageEligibilityRequest", "param" : ["patient"]},
  {"code" : "CoverageEligibilityResponse", "param" : ["patient"]},
  {"code" : "DetectedIssue", "param" : ["patient"]},
  {"code" : "Device"}, 
  {"code" : "DeviceDefinition"},
  {"code" : "DeviceMetric"},
  {"code" : "DeviceRequest", "param" : ["subject", "performer"]},
  {"code" : "DeviceUseStatement", "param" : ["subject"]},
  {"code" : "DiagnosticReport", "param" : ["subject"]},
  {"code" : "DocumentManifest", "param" : ["subject", "author", "recipient"]},
  {"code" : "DocumentReference", "param" : ["subject", "author"]},
  {"code" : "EffectEvidenceSynthesis"},
  {"code" : "Encounter", "param" : ["patient"]},
  {"code" : "Endpoint"},
  {"code" : "EnrollmentRequest", "param" : ["subject"]},
  {"code" : "EnrollmentResponse"},
  {"code" : "EpisodeOfCare", "param" : ["patient"]},
  {"code" : "EventDefinition"},
  {"code" : "Evidence"},
  {"code" : "EvidenceVariable"},
  {"code" : "ExampleScenario"},
  {"code" : "ExplanationOfBenefit", "param" : ["patient", "payee"]},
  {"code" : "FamilyMemberHistory", "param" : ["patient"]},
  {"code" : "Flag", "param" : ["patient"]},
  {"code" : "Goal", "param" : ["patient"]},
  {"code" : "GraphDefinition"},
  {"code" : "Group", "param" : ["member"]},
  {"code" : "GuidanceResponse"},
  {"code" : "HealthcareService"},
  {"code" : "ImagingStudy", "param" : ["patient"]},
  {"code" : "Immunization", "param" : ["patient"]},
  {"code" : "ImmunizationEvaluation", "param" : ["patient"]},
  {"code" : "ImmunizationRecommendation", "param" : ["patient"]},
  {"code" : "ImplementationGuide"},
  {"code" : "InsurancePlan"},
  {"code" : "Invoice", "param" : ["subject", "patient", "recipient"]},
  {"code" : "Library"},
  {"code" : "Linkage"},
  {"code" : "List", "param" : ["subject", "source"]},
  {"code" : "Location"},
  {"code" : "Measure"},
  {"code" : "MeasureReport", "param" : ["patient"]},
  {"code" : "Media", "param" : ["subject"]},
  {"code" : "Medication"},
  {"code" : "MedicationAdministration", "param" : ["patient", "performer", "subject"]},
  {"code" : "MedicationDispense", "param" : ["subject", "patient", "receiver"]},
  {"code" : "MedicationKnowledge"},
  {"code" : "MedicationRequest", "param" : ["subject"]},
  {"code" : "MedicationStatement", "param" : ["subject"]},
  {"code" : "MedicinalProduct"},
  {"code" : "MedicinalProductAuthorization"},
  {"code" : "MedicinalProductContraindication"},
  {"code" : "MedicinalProductIndication"},
  {"code" : "MedicinalProductIngredient"},
  {"code" : "MedicinalProductInteraction"},
  {"code" : "MedicinalProductManufactured"},
  {"code" : "MedicinalProductPackaged"},
  {"code" : "MedicinalProductPharmaceutical"},
  {"code" : "MedicinalProductUndesirableEffect"},
  {"code" : "MessageDefinition"},
  {"code" : "MessageHeader"},
  {"code" : "MolecularSequence", "param" : ["patient"]}, 
  {"code" : "NamingSystem"},
  {"code" : "NutritionOrder", "param" : ["patient"]},
  {"code" : "Observation", "param" : ["subject", "performer"]},
  {"code" : "ObservationDefinition"},
  {"code" : "OperationDefinition"},
  {"code" : "OperationOutcome"},
  {"code" : "Organization"},
  {"code" : "OrganizationAffiliation"},
  {"code" : "Patient", "param" : ["link"]},
  {"code" : "PaymentNotice"},
  {"code" : "PaymentReconciliation"},
  {"code" : "Person", "param" : ["patient"]},
  {"code" : "PlanDefinition"},
  {"code" : "Practitioner"},
  {"code" : "PractitionerRole"},
  {"code" : "Procedure", "param" : ["patient", "performer"]},
  {"code" : "Provenance", "param" : ["patient"]},
  {"code" : "Questionnaire"},
  {"code" : "QuestionnaireResponse", "param" : ["subject", "author"]},
  {"code" : "RelatedPerson", "param" : ["patient"]},
  {"code" : "RequestGroup", "param" : ["subject", "participant"]},
  {"code" : "ResearchDefinition"},
  {"code" : "ResearchElementDefinition"},
  {"code" : "ResearchStudy"},
  {"code" : "ResearchSubject", "param" : ["individual"]},
  {"code" : "RiskAssessment", "param" : ["subject"]},
  {"code" : "RiskEvidenceSynthesis"},
  {"code" : "Schedule", "param" : ["actor"]},
  {"code" : "SearchParameter"},
  {"code" : "ServiceRequest", "param" : ["subject", "performer"]},
  {"code" : "Slot"},
  {"code" : "Specimen", "param" : ["subject"]},
  {"code" : "SpecimenDefinition"},
  {"code" : "StructureDefinition"},
  {"code" : "StructureMap"},
  {"code" : "Subscription"},
  {"code" : "Substance"},
  {"code" : "SubstanceNucleicAcid"},
  {"code" : "SubstancePolymer"},
  {"code" : "SubstanceProtein"},
  {"code" : "SubstanceReferenceInformation"},
  {"code" : "SubstanceSourceMaterial"},
  {"code" : "SubstanceSpecification"},
  {"code" : "SupplyDelivery", "param" : ["patient"]},
  {"code" : "SupplyRequest", "param" : ["subject"]},
  {"code" : "Task"},
  {"code" : "TerminologyCapabilities"},
  {"code" : "TestReport"},
  {"code" : "TestScript"},
  {"code" : "ValueSet"},
  {"code" : "VerificationResult"},
  {"code" : "VisionPrescription", "param" : ["patient"]}]
}
```

Make sure that the resource is stored successfully by receiving a `Status: 201` response.

## Step 6: Request $summary using REST Console

The [$summary](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html) operation requires either the logical ID (`Patient.id`) or a business identifier (`Patient.identifier`) of the patient. 
You can use the following request to view all available patients:
```
GET /fhir/Patient?_elements=id,identifier
```

To request the IPS "document" _Bundle_ for a specific patient using the REST Console, you can use the following request:
```
GET /fhir/Patient/[id]/$summary
```

Replace [id] with the logical ID of the patient you want to retrieve the IPS document for. 

For example:
```
GET /fhir/Patient/08b9a2bf-7492-4d15-b97f-00b54a3b35ee/$summary
```

## Step 7: Request $summary using HTTP Client

If you're starting the Aidbox FHIR server for the first time, the initial step involves creating a _Client_ resource with an ID and secret.
Since the newly created client does not have default permissions to access the Aidbox REST API, the next step is to configure access policies.
Refer to the documentation: [Create and test access control](https://docs.aidbox.app/modules-1/security-and-access-control/auth/basic-auth)

The easiest way to achieve this is by navigating to Auth > Sandbox in the Aidbox Web Admin UI and performing REST queries to create the 'basic' client and assign the AccessPolicy.

Once the client is created, you can perform the `$summary` operation using an HTTP tool, similar to the following example:
```
curl --location 'http://localhost:8888/fhir/Patient?_elements=id%2Cidentifier' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic YmFzaWM6c2VjcmV0' \
--data ''
```

