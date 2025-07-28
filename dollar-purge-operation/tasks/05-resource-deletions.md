# Task 5: Resource Deletions Configuration

## Objective
Create comprehensive list of all FHIR resource types and their deletion parameters.

## File to create:
- `src/resourceDeletions.ts`

## Content needed:

### 1. Resource Deletions Array
Array of 67 resource types with their conditional delete parameters:

```typescript
export const RESOURCE_DELETIONS: ResourceDeletion[] = [
  { resourceType: 'Account', conditionalParams: 'subject=Patient/%s', historyTableName: 'account_history' },
  { resourceType: 'AdverseEvent', conditionalParams: 'subject=Patient/%s', historyTableName: 'adverseevent_history' },
  { resourceType: 'AllergyIntolerance', conditionalParams: 'patient=Patient/%s', historyTableName: 'allergyintolerance_history' },
  // ... continue for all 67 resource types
];
```

### 2. Helper Functions
```typescript
export function getResourceDeletionsForPatient(patientId: string): ResourceDeletion[]
export function getHistoryCleanupQueries(patientId: string): string[]
```

## Resource types to include:
Account, AdverseEvent, AllergyIntolerance, Appointment, AppointmentResponse, AuditEvent, Basic, BodyStructure, CarePlan, CareTeam, ChargeItem, Claim, ClaimResponse, ClinicalImpression, Communication, CommunicationRequest, Composition, Condition, Consent, Coverage, CoverageEligibilityRequest, CoverageEligibilityResponse, DetectedIssue, DeviceRequest, DeviceUseStatement, DiagnosticReport, DocumentManifest, DocumentReference, Encounter, EnrollmentRequest, EpisodeOfCare, ExplanationOfBenefit, FamilyMemberHistory, Flag, Goal, Group, ImagingStudy, Immunization, ImmunizationEvaluation, ImmunizationRecommendation, Invoice, List, MeasureReport, Media, MedicationAdministration, MedicationDispense, MedicationRequest, MedicationStatement, MolecularSequence, NutritionOrder, Observation, Patient, Person, Procedure, Provenance, QuestionnaireResponse, RelatedPerson, RequestGroup, ResearchSubject, RiskAssessment, Schedule, ServiceRequest, Specimen, SupplyDelivery, SupplyRequest, VisionPrescription

## Success criteria:
- All 67 resource types are included
- Correct conditional parameters for each type
- Helper functions work correctly
- History table names follow Aidbox conventions