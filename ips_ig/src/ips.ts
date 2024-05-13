import { randomUUID } from "node:crypto";
import { generateCompositionNarrative, generateSimpleNarrative } from "./narrative";
import {
  BundleEntry,
  HttpClient,
  IpsProfile,
  PatientData,
  SectionName,
  SectionProfiles,
  SectionToGenerateFuncMap,
  SimpleNarrativeEntry,
} from "./types";

const addEntry = (patientData: PatientData) => {
  if (patientData.length === 0) return {};
  return {
    entry: patientData.map((resource) => ({
      reference: `${resource.resource.resourceType}/${resource.resource.id}`,
    })),
  };
};

const buildSection = (
  sectionData: { title: string; code: any; text: { status: string; div: string } },
  entry: PatientData
) => {
  if (entry.length === 0) return null;

  return {
    ...sectionData,
    ...addEntry(entry),
  };
};

const sectionProfiles: SectionProfiles = {
  MedicationSummary: {
    MedicationStatement: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips",
    ],
    MedicationRequest: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationRequest-uv-ips",
    ],
  },
  AllergyIntolerance: {
    AllergyIntolerance: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips",
    ],
  },
  ProblemList: {
    Condition: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips"],
  },
  Procedures: {
    Procedure: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips"],
  },
  Immunizations: {
    Immunization: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips"],
  },
  MedicalDevices: {
    DeviceUseStatement: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/DeviceUseStatement-uv-ips",
    ],
  },
  DiagnosticResults: {
    DiagnosticReport: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/DiagnosticReport-uv-ips",
    ],
    Observation: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips",
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-laboratory-uv-ips",
    ],
  },
  VitalSigns: { Observation: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] },
  IllnessHistory: {
    Condition: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips"],
  },
  Pregnancy: {
    Observation: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-status-uv-ips",
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-outcome-uv-ips",
    ],
  },
  SocialHistory: {
    Observation: [
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-tobaccouse-uv-ips",
      "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-alcoholuse-uv-ips",
    ],
  },
};

const findIntersection = (
  sectionProfiles: Array<string>,
  resourceProfiles: Array<string>
) => sectionProfiles.find((profile) => resourceProfiles.includes(profile));

const getSectionResources = (
  patientData: PatientData,
  sectionsProfiles: Record<string, Array<string>>
) => {
  return patientData.reduce((acc: PatientData, { resource }) => {
    const rightResourceType = Object.keys(sectionsProfiles).includes(
      resource.resourceType
    );
    const validResource =
      rightResourceType &&
      resource.meta?.profile &&
      findIntersection(sectionsProfiles[resource.resourceType], resource.meta.profile);

    if (validResource) {
      acc.push({ resource });
    }
    return acc;
  }, []);
};

// ----- Required sections -----
const generateProblemListSection = (patientData: PatientData) => {
  const validConditions = getSectionResources(patientData, sectionProfiles.ProblemList);

  const section = {
    title: "Active Problems",
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

  return section;
};

const generateAllergyIntoleranceSection = (patientData: PatientData) => {
  const validAllergies = getSectionResources(
    patientData,
    sectionProfiles.AllergyIntolerance
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

  return section;
};

const generateMedicationSummarySection = (patientData: PatientData) => {
  const validMedications = getSectionResources(
    patientData,
    sectionProfiles.MedicationSummary
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

  return section;
};

// ----- Recommended sections -----
const generateImmunizationsSection = (patientData: PatientData) => {
  const validImmunizations = getSectionResources(
    patientData,
    sectionProfiles.Immunizations
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
  };

  return buildSection(section, validImmunizations);
};

const generateProceduresSection = (patientData: PatientData) => {
  const validProcedures = getSectionResources(patientData, sectionProfiles.Procedures);

  const section = {
    title: "Procedures",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "47519-4",
          display: "History of Procedures Document",
        },
      ],
    },
    text: generateSimpleNarrative(validProcedures as SimpleNarrativeEntry),
  };

  return buildSection(section, validProcedures);
};

const generateMedicalDevicesSection = (patientData: PatientData, http: HttpClient) => {
  const validDevices = getSectionResources(patientData, sectionProfiles.MedicalDevices);

  const section = {
    title: "Medical Devices",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "46264-8",
          display: "History of medical device use",
        },
      ],
    },
    text: {
      status: "generated",
      div: '<div xmlns="http://www.w3.org/1999/xhtml">No known devices in use</div>',
    },
  };

  return buildSection(section, validDevices);
};

const generateDiagnosticResultsSection = (patientData: PatientData, http: HttpClient) => {
  const validDiagnosticResults = getSectionResources(
    patientData,
    sectionProfiles.DiagnosticResults
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
  };

  return buildSection(section, validDiagnosticResults);
};

// ----- Optional sections -----
const generateVitalSignsSection = (patientData: PatientData, http: HttpClient) => {
  const validVitalSigns = getSectionResources(patientData, sectionProfiles.VitalSigns);

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
  };

  return buildSection(section, validVitalSigns);
};

const generatePregnancySection = (patientData: PatientData, http: HttpClient) => {
  const validObservations = getSectionResources(patientData, sectionProfiles.Pregnancy);

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
    text: generateSimpleNarrative(validObservations as SimpleNarrativeEntry),
  };

  return buildSection(section, validObservations);
};

const generateSocialHistorySection = (patientData: PatientData, http: HttpClient) => {
  const validObservations = getSectionResources(
    patientData,
    sectionProfiles.SocialHistory
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
    text: generateSimpleNarrative(validObservations as SimpleNarrativeEntry),
  };

  return buildSection(section, validObservations);
};

const generateIllnessHistorySection = (patientData: PatientData) => {
  const validConditions = getSectionResources(
    patientData,
    sectionProfiles.IllnessHistory
  );

  const section = {
    title: "Past history of illnesses",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11348-0",
          display: "History of Past illness Narrative",
        },
      ],
    },
    text: generateSimpleNarrative(validConditions as SimpleNarrativeEntry),
  };

  return buildSection(section, validConditions);
};

const sectionNames: Array<SectionName> = [
  "MedicationSummary",
  "AllergyIntolerance",
  "ProblemList",
  "Procedures",
  "Immunizations",
  "MedicalDevices",
  "DiagnosticResults",
  "VitalSigns",
  "IllnessHistory",
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

export const addFullUrl = (
  resources: Array<{ resource: { id: string; resourceType: string } }>,
  aidboxBaseUrl: string
) => {
  return resources.reduce(
    (acc, item) => {
      acc.push({
        resource: item.resource,
        fullUrl: `${aidboxBaseUrl}/fhir/${item.resource.resourceType}/${item.resource.id}`,
      });
      return acc;
    },
    [] as Array<{ resource: { id: string }; fullUrl: string }>
  );
};

const buildQueriesForSection = (
  sectionName: SectionName,
  patientId: string
): Array<string> | undefined => {
  const profiles = sectionProfiles[sectionName];
  if (!profiles) return undefined;

  return Object.keys(profiles).map(
    (resourceType) =>
      `/fhir/${resourceType}?patient=${patientId}&_profile=${profiles[resourceType].join(",")}`
  );
};

const fetchSummaryResources = async (http: HttpClient, patientId: string) => {
  const bundleEntry = sectionNames.reduce((acc: BundleEntry, sectionName) => {
    if (sectionName === "IllnessHistory" && sectionNames.includes("ProblemList"))
      return acc;

    const sectionsQueries = buildQueriesForSection(sectionName, patientId);
    if (sectionsQueries) {
      const entries = sectionsQueries.map((query) => ({
        request: { method: "GET", url: query },
      }));

      acc.push(...entries);
    }
    return acc;
  }, []);

  const { response }: any = await http.post("", {
    json: {
      resourceType: "Bundle",
      type: "transaction",
      entry: bundleEntry,
    },
  });

  return response.data?.entry?.reduce((acc: PatientData, item: any) => {
    if (item.resource?.total > 0) {
      acc.push(...item.resource?.entry);
    }
    return acc;
  }, []);
};

export const generateSections = async (http: HttpClient, patientId: string) => {
  const patientData = await fetchSummaryResources(http, patientId);
  const sections = sectionNames.reduce((acc: any, item) => {
    const section = sectionToGenerateFuncMap[item](patientData, http);

    if (section) {
      acc.push(section);
    }

    return acc;
  }, []);

  return { sections, bundleData: patientData };
};

export const createComposition = (sections: any, patientId: string) => {
  const now = new Date();

  const composition = {
    resourceType: "Composition",
    id: randomUUID(),
    meta: {
      profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips"],
    },
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
