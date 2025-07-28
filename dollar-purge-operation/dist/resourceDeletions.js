"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOURCE_DELETIONS = void 0;
exports.getResourceDeletionsForPatient = getResourceDeletionsForPatient;
exports.getHistoryCleanupQueries = getHistoryCleanupQueries;
exports.RESOURCE_DELETIONS = [
    { resourceType: 'Account', conditionalParams: 'subject=Patient/%s', historyTableName: 'account_history' },
    { resourceType: 'AdverseEvent', conditionalParams: 'subject=Patient/%s', historyTableName: 'adverseevent_history' },
    { resourceType: 'AllergyIntolerance', conditionalParams: 'patient=Patient/%s', historyTableName: 'allergyintolerance_history' },
    { resourceType: 'Appointment', conditionalParams: 'actor=Patient/%s', historyTableName: 'appointment_history' },
    { resourceType: 'AppointmentResponse', conditionalParams: 'actor=Patient/%s', historyTableName: 'appointmentresponse_history' },
    { resourceType: 'AuditEvent', conditionalParams: 'patient=Patient/%s', historyTableName: 'auditevent_history' },
    { resourceType: 'Basic', conditionalParams: 'patient=Patient/%s', historyTableName: 'basic_history' },
    { resourceType: 'BodyStructure', conditionalParams: 'patient=Patient/%s', historyTableName: 'bodystructure_history' },
    { resourceType: 'CarePlan', conditionalParams: 'patient=Patient/%s', historyTableName: 'careplan_history' },
    { resourceType: 'CareTeam', conditionalParams: 'patient=Patient/%s', historyTableName: 'careteam_history' },
    { resourceType: 'ChargeItem', conditionalParams: 'subject=Patient/%s', historyTableName: 'chargeitem_history' },
    { resourceType: 'Claim', conditionalParams: 'patient=Patient/%s', historyTableName: 'claim_history' },
    { resourceType: 'ClaimResponse', conditionalParams: 'patient=Patient/%s', historyTableName: 'claimresponse_history' },
    { resourceType: 'ClinicalImpression', conditionalParams: 'subject=Patient/%s', historyTableName: 'clinicalimpression_history' },
    { resourceType: 'Communication', conditionalParams: 'subject=Patient/%s', historyTableName: 'communication_history' },
    { resourceType: 'CommunicationRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'communicationrequest_history' },
    { resourceType: 'Composition', conditionalParams: 'subject=Patient/%s', historyTableName: 'composition_history' },
    { resourceType: 'Condition', conditionalParams: 'patient=Patient/%s', historyTableName: 'condition_history' },
    { resourceType: 'Consent', conditionalParams: 'patient=Patient/%s', historyTableName: 'consent_history' },
    { resourceType: 'Coverage', conditionalParams: 'beneficiary=Patient/%s', historyTableName: 'coverage_history' },
    { resourceType: 'CoverageEligibilityRequest', conditionalParams: 'patient=Patient/%s', historyTableName: 'coverageeligibilityrequest_history' },
    { resourceType: 'CoverageEligibilityResponse', conditionalParams: 'patient=Patient/%s', historyTableName: 'coverageeligibilityresponse_history' },
    { resourceType: 'DetectedIssue', conditionalParams: 'patient=Patient/%s', historyTableName: 'detectedissue_history' },
    { resourceType: 'DeviceRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'devicerequest_history' },
    { resourceType: 'DeviceUseStatement', conditionalParams: 'subject=Patient/%s', historyTableName: 'deviceusestatement_history' },
    { resourceType: 'DiagnosticReport', conditionalParams: 'subject=Patient/%s', historyTableName: 'diagnosticreport_history' },
    { resourceType: 'DocumentManifest', conditionalParams: 'subject=Patient/%s', historyTableName: 'documentmanifest_history' },
    { resourceType: 'DocumentReference', conditionalParams: 'subject=Patient/%s', historyTableName: 'documentreference_history' },
    { resourceType: 'Encounter', conditionalParams: 'patient=Patient/%s', historyTableName: 'encounter_history' },
    { resourceType: 'EnrollmentRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'enrollmentrequest_history' },
    { resourceType: 'EpisodeOfCare', conditionalParams: 'patient=Patient/%s', historyTableName: 'episodeofcare_history' },
    { resourceType: 'ExplanationOfBenefit', conditionalParams: 'patient=Patient/%s', historyTableName: 'explanationofbenefit_history' },
    { resourceType: 'FamilyMemberHistory', conditionalParams: 'patient=Patient/%s', historyTableName: 'familymemberhistory_history' },
    { resourceType: 'Flag', conditionalParams: 'patient=Patient/%s', historyTableName: 'flag_history' },
    { resourceType: 'Goal', conditionalParams: 'patient=Patient/%s', historyTableName: 'goal_history' },
    { resourceType: 'Group', conditionalParams: 'member=Patient/%s', historyTableName: 'group_history' },
    { resourceType: 'ImagingStudy', conditionalParams: 'patient=Patient/%s', historyTableName: 'imagingstudy_history' },
    { resourceType: 'Immunization', conditionalParams: 'patient=Patient/%s', historyTableName: 'immunization_history' },
    { resourceType: 'ImmunizationEvaluation', conditionalParams: 'patient=Patient/%s', historyTableName: 'immunizationevaluation_history' },
    { resourceType: 'ImmunizationRecommendation', conditionalParams: 'patient=Patient/%s', historyTableName: 'immunizationrecommendation_history' },
    { resourceType: 'Invoice', conditionalParams: 'subject=Patient/%s', historyTableName: 'invoice_history' },
    { resourceType: 'List', conditionalParams: 'subject=Patient/%s', historyTableName: 'list_history' },
    { resourceType: 'MeasureReport', conditionalParams: 'patient=Patient/%s', historyTableName: 'measurereport_history' },
    { resourceType: 'Media', conditionalParams: 'subject=Patient/%s', historyTableName: 'media_history' },
    { resourceType: 'MedicationAdministration', conditionalParams: 'patient=Patient/%s', historyTableName: 'medicationadministration_history' },
    { resourceType: 'MedicationDispense', conditionalParams: 'patient=Patient/%s', historyTableName: 'medicationdispense_history' },
    { resourceType: 'MedicationRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'medicationrequest_history' },
    { resourceType: 'MedicationStatement', conditionalParams: 'subject=Patient/%s', historyTableName: 'medicationstatement_history' },
    { resourceType: 'MolecularSequence', conditionalParams: 'patient=Patient/%s', historyTableName: 'molecularsequence_history' },
    { resourceType: 'NutritionOrder', conditionalParams: 'patient=Patient/%s', historyTableName: 'nutritionorder_history' },
    { resourceType: 'Observation', conditionalParams: 'subject=Patient/%s', historyTableName: 'observation_history' },
    { resourceType: 'Patient', conditionalParams: 'link=Patient/%s', historyTableName: 'patient_history' },
    { resourceType: 'Person', conditionalParams: 'patient=Patient/%s', historyTableName: 'person_history' },
    { resourceType: 'Procedure', conditionalParams: 'patient=Patient/%s', historyTableName: 'procedure_history' },
    { resourceType: 'Provenance', conditionalParams: 'patient=Patient/%s', historyTableName: 'provenance_history' },
    { resourceType: 'QuestionnaireResponse', conditionalParams: 'subject=Patient/%s', historyTableName: 'questionnaireresponse_history' },
    { resourceType: 'RelatedPerson', conditionalParams: 'patient=Patient/%s', historyTableName: 'relatedperson_history' },
    { resourceType: 'RequestGroup', conditionalParams: 'subject=Patient/%s', historyTableName: 'requestgroup_history' },
    { resourceType: 'ResearchSubject', conditionalParams: 'individual=Patient/%s', historyTableName: 'researchsubject_history' },
    { resourceType: 'RiskAssessment', conditionalParams: 'subject=Patient/%s', historyTableName: 'riskassessment_history' },
    { resourceType: 'Schedule', conditionalParams: 'actor=Patient/%s', historyTableName: 'schedule_history' },
    { resourceType: 'ServiceRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'servicerequest_history' },
    { resourceType: 'Specimen', conditionalParams: 'subject=Patient/%s', historyTableName: 'specimen_history' },
    { resourceType: 'SupplyDelivery', conditionalParams: 'patient=Patient/%s', historyTableName: 'supplydelivery_history' },
    { resourceType: 'SupplyRequest', conditionalParams: 'subject=Patient/%s', historyTableName: 'supplyrequest_history' },
    { resourceType: 'VisionPrescription', conditionalParams: 'patient=Patient/%s', historyTableName: 'visionprescription_history' }
];
function getResourceDeletionsForPatient(patientId) {
    return exports.RESOURCE_DELETIONS.map(deletion => ({
        ...deletion,
        conditionalParams: deletion.conditionalParams.replace('%s', patientId)
    }));
}
function getHistoryCleanupQueries(patientId) {
    const queries = [];
    queries.push(`DELETE FROM patient_history WHERE id = '${patientId}'`);
    for (const deletion of exports.RESOURCE_DELETIONS) {
        if (deletion.resourceType === 'Patient')
            continue;
        const tableName = deletion.historyTableName;
        if (deletion.conditionalParams.includes('subject=')) {
            queries.push(`
        DELETE FROM ${tableName} 
        WHERE resource->>'subject' = 'Patient/${patientId}' 
           OR resource->'subject'->>'reference' = 'Patient/${patientId}'
      `);
        }
        else if (deletion.conditionalParams.includes('patient=')) {
            queries.push(`
        DELETE FROM ${tableName} 
        WHERE resource->>'patient' = 'Patient/${patientId}' 
           OR resource->'patient'->>'reference' = 'Patient/${patientId}'
      `);
        }
        else {
            const paramName = deletion.conditionalParams.split('=')[0];
            queries.push(`
        DELETE FROM ${tableName} 
        WHERE resource->>'${paramName}' = 'Patient/${patientId}' 
           OR resource->'${paramName}'->>'reference' = 'Patient/${patientId}'
      `);
        }
    }
    return queries;
}
