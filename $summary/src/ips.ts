import { randomUUID } from "node:crypto";
import { generateCompositionNarrative, generateSimpleNarrative } from "./narrative.js";
import {
  HttpClient,
  IpsProfile,
  PatientData,
  SectionName,
  SectionToGenerateFuncMap,
  SimpleNarrativeEntry,
} from "./types";

const validateResources = async (
  resources: PatientData,
  resourceProfileMap: Record<string, IpsProfile>,
  http: HttpClient
) => {
  let result = [];
  for (const { resource } of resources) {
    if (!Object.keys(resourceProfileMap).includes(resource.resourceType)) continue;
    const profile = resourceProfileMap[resource.resourceType];
    const { response }: any = await http.post(
      `fhir/${resource.resourceType}/${resource.id}/$validate?mode=profile&profile=${profile}`,
      { json: resource }
    );

    if (response.data?.id === "allok") {
      result.push({ resource: resource });
    }
  }
  return result;
};

const validateConditions = async (patientData: PatientData, http: HttpClient) => {
  return validateResources(
    patientData,
    { Condition: "http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips" },
    http
  );
};

const addEntry = (patientData: PatientData) => {
  if (patientData.length === 0) return {};
  return {
    entry: patientData.map((resource) => ({
      reference: `${resource.resource.resourceType}/${resource.resource.id}`,
    })),
  };
};

const generateProblemListSection = async (patientData: PatientData, http: HttpClient) => {
  const validConditions = await validateConditions(patientData, http);

  const section = {
    title: "Problem List",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11450-4",
          display: "Problem list - Reported",
        },
      ],
    },
    text: generateSimpleNarrative(validConditions as SimpleNarrativeEntry),
    ...addEntry(validConditions),
  };

  return { section, bundleData: validConditions };
};

const generateIllnessHistorySection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const validConditions = await validateConditions(patientData, http);

  const section = {
    title: "Past history of illnesses",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11348-0",
          display: "History of Past illness",
        },
      ],
    },
    text: generateSimpleNarrative(validConditions as SimpleNarrativeEntry),
    ...addEntry(validConditions),
  };

  return { section, bundleData: validConditions };
};

const generateAllergyIntoleranceSection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const validAllergies = await validateResources(
    patientData,
    {
      AllergyIntolerance:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips",
    },
    http
  );

  const section = {
    title: "Allergies and Intolerances",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "48765-2",
          display: "Allergies and adverse reactions Document",
        },
      ],
    },
    text: generateSimpleNarrative(validAllergies as SimpleNarrativeEntry),
    ...addEntry(validAllergies),
  };

  return { section, bundleData: validAllergies };
};

const getIdFromRef = (ref: string) => {
  const splitedRef = ref.split("/");
  return splitedRef[splitedRef.length - 1];
};

const fetchMedications = async (patientData: PatientData, http: HttpClient) => {
  const medicationIds = patientData.reduce((acc: string[], { resource }: any) => {
    if (
      ["MedicationStatement", "MedicationRequest"].includes(resource.resourceType) &&
      resource.medicationReference?.reference
    ) {
      acc.push(getIdFromRef(resource.medicationReference?.reference));
    }
    return acc;
  }, []);

  if (medicationIds.length === 0) return [];

  const uniqIds = [...new Set(medicationIds)];
  const {
    response: { data },
  }: any = await http.get(`fhir/Medication?_id=${uniqIds.join(",")}`);

  return data.entry;
};

const generateMedicationSummarySection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  // TODO: Get rid of fetchMedications when medication search param is fixed, rewrite $everything with _include/_revinclude
  const medications = await fetchMedications(patientData, http);
  const validMedications = await validateResources(
    [...patientData, ...medications],
    {
      MedicationStatement:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips",
      MedicationRequest:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationRequest-uv-ips",
      Medication: "http://hl7.org/fhir/uv/ips/StructureDefinition/Medication-uv-ips",
    },
    http
  );

  const section = {
    title: "Medication",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "10160-0",
          display: "History of Medication use Narrative",
        },
      ],
    },
    text: generateSimpleNarrative(validMedications as SimpleNarrativeEntry),
    ...addEntry(validMedications),
  };

  return { section, bundleData: validMedications };
};

const generateImmunizationsSection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const validImmunizations = await validateResources(
    patientData,
    {
      Immunization: "http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips",
    },
    http
  );

  const section = {
    title: "Immunizations",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11369-6",
          display: "History of Immunization Narrative",
        },
      ],
    },
    text: generateSimpleNarrative(validImmunizations as SimpleNarrativeEntry),
    ...addEntry(validImmunizations),
  };

  return { section, bundleData: validImmunizations };
};

const generateProceduresSection = async (patientData: PatientData, http: HttpClient) => {
  const validProcedures = await validateResources(
    patientData,
    {
      Procedure: "http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips",
    },
    http
  );

  const section = {
    title: "Procedures",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "47519-4",
          display: "History of Procedures",
        },
      ],
    },
    text: generateSimpleNarrative(validProcedures as SimpleNarrativeEntry),
    ...addEntry(validProcedures),
  };

  return { section, bundleData: validProcedures };
};

const generateMedicalDevicesSection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const validDevices = await validateResources(
    patientData,
    {
      DeviceUseStatement:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/DeviceUseStatement-uv-ips",
    },
    http
  );

  const section = {
    title: "Medical Devices",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "47519-4",
          display: "History of medical device use",
        },
      ],
    },
    text: {
      status: "generated",
      div: '<div xmlns="http://www.w3.org/1999/xhtml">No known devices in use</div>',
    },
    ...addEntry(validDevices),
  };

  return { section, bundleData: validDevices };
};

const generateDiagnosticResultsSection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const validDiagnosticResults = await validateResources(
    patientData,
    {
      DiagnosticReport:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/DiagnosticReport-uv-ips",
      Observation:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips",
    },
    http
  );

  const section = {
    title: "Results",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "30954-2",
          display: "Relevant diagnostic tests/laboratory data Narrative",
        },
      ],
    },
    text: generateSimpleNarrative(
      validDiagnosticResults.filter(
        ({ resource }) => resource.resourceType === "Observation"
      ) as SimpleNarrativeEntry
    ),
    ...addEntry(validDiagnosticResults),
  };

  return { section, bundleData: validDiagnosticResults };
};

const generateVitalSignsSection = async (patientData: PatientData, http: HttpClient) => {
  const validVitalSigns = patientData.filter(
    ({ resource }) =>
      resource.resourceType === "Observation" &&
      resource.category?.find((item) =>
        item.coding?.find((coding) => coding.code === "vital-signs")
      )
  );

  const section = {
    title: "Vital Signs",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8716-3",
          display: "Vital signs",
        },
      ],
    },
    text: generateSimpleNarrative(validVitalSigns as SimpleNarrativeEntry),
    ...addEntry(validVitalSigns),
  };

  return { section, bundleData: validVitalSigns };
};

const generatePregnancySection = async (patientData: PatientData, http: HttpClient) => {
  const pregnancyStatuses = patientData.filter(
    ({ resource }) =>
      resource.resourceType === "Observation" &&
      resource.code?.coding?.find((item) => item.code === "82810-3") // Observation-pregnancy-status-uv-ip is a fixed value code
  );
  const pregnancyOutcomes = await validateResources(
    patientData,
    {
      Observation:
        "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-outcome-uv-ips",
    },
    http
  );

  const section = {
    title: "Pregnancy",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "10162-6",
          display: "History of pregnancies Narrative",
        },
      ],
    },
    text: generateSimpleNarrative([
      ...pregnancyStatuses,
      ...pregnancyOutcomes,
    ] as SimpleNarrativeEntry),
    ...addEntry([...pregnancyStatuses, ...pregnancyOutcomes]),
  };

  return { section, bundleData: [...pregnancyStatuses, ...pregnancyOutcomes] };
};

const generateSocialHistorySection = async (
  patientData: PatientData,
  http: HttpClient
) => {
  const tobaccoAndAlcoholObservations = patientData.filter(
    ({ resource }) =>
      resource.resourceType === "Observation" &&
      resource.code?.coding?.find(
        // Observation tobacco use and alcohol have a fixed value code
        (item) => item.code === "72166-2" || item.code === "74013-4"
      )
  );

  const section = {
    title: "Social History",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "29762-2",
          display: "Social history Narrative",
        },
      ],
    },
    text: generateSimpleNarrative(tobaccoAndAlcoholObservations as SimpleNarrativeEntry),
    ...addEntry(tobaccoAndAlcoholObservations),
  };

  return { section, bundleData: tobaccoAndAlcoholObservations };
};

const sectionNames: Array<SectionName> = [
  "ProblemList",
  "AllergyIntolerance",
  "MedicationSummary",
  "Immunizations",
  "IllnessHistory",
  "Procedures",
  "MedicalDevices",
  "DiagnosticResults",
  "VitalSigns",
  "Pregnancy",
  "SocialHistory",
];

const sectionToGenerateFuncMap: SectionToGenerateFuncMap = {
  ProblemList: generateProblemListSection,
  IllnessHistory: generateIllnessHistorySection,
  AllergyIntolerance: generateAllergyIntoleranceSection,
  MedicationSummary: generateMedicationSummarySection,
  Immunizations: generateImmunizationsSection,
  Procedures: generateProceduresSection,
  MedicalDevices: generateMedicalDevicesSection,
  DiagnosticResults: generateDiagnosticResultsSection,
  VitalSigns: generateVitalSignsSection,
  Pregnancy: generatePregnancySection,
  SocialHistory: generateSocialHistorySection,
};

export const removeDuplicatedResources = (
  resources: Array<{ resource: { id: string } }>
) => {
  return resources.reduce(
    (acc, item) => {
      const duplicatedResource = acc.find(
        ({ resource }) => resource.id === item.resource?.id
      );
      if (!duplicatedResource) {
        acc.push(item);
      }
      return acc;
    },
    [] as Array<{ resource: { id: string } }>
  );
};

export const generateSections = (patientData: PatientData, http: HttpClient) => {
  return sectionNames.reduce(
    async (previousPromise: Promise<any>, item) => {
      const acc = await previousPromise;
      const { section, bundleData } = await sectionToGenerateFuncMap[item](
        patientData,
        http
      );

      return {
        sections: [...acc.sections, section],
        bundleData: [...acc.bundleData, ...bundleData],
      };
    },
    Promise.resolve({ sections: [], bundleData: [] })
  );
};

export const createComposition = (sections: any, patientId: string) => {
  const now = new Date();

  const composition = {
    resourceType: "Composition",
    id: randomUUID(),
    date: now.toISOString(),
    status: "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "60591-5",
          display: "Patient summary Document",
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    author: [
      {
        display: "Aidbox",
        type: "Device",
      },
    ],
    title: `Patient Summary as of ${now.toString()}`,
    event: [
      {
        code: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActClass",
                code: "PCPR",
              },
            ],
          },
        ],
        period: {
          end: now.toISOString(),
        },
      },
    ],
    section: sections,
  };

  return {
    ...composition,
    text: generateCompositionNarrative({
      id: composition.id,
      status: composition.status,
      title: composition.title,
      eventDate: composition.event[0].period.end,
    }),
  };
};
