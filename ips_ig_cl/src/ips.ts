import { randomUUID } from "node:crypto";
import { generateCompositionNarrative, generateSimpleNarrative } from "./narrative.js";
import {
  BundleEntry,
  HttpClient,
  PatientData,
  SectionName,
  SectionProfiles,
  SectionToGenerateFuncMap,
  SimpleNarrativeEntry,
} from "./types";
import { DomainResource } from "@aidbox/sdk-r4/types/index.js";
import Fastify from "fastify";
import { ClinicalImpressionStatus } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/ClinicalImpression.js";

const buildReference = (resourceType: string, id: string) => {
  return `${resourceType}/${id}`;
}

const addEntry = (patientData: PatientData) => {
  if (patientData.length === 0) return {};
  return {
    entry: patientData.map((resource) => ({
      reference: buildReference(resource.resource.resourceType, resource.resource.id!),
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
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/RegMedicamentos-cl-ips",
    ],
    MedicationRequest: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/MedicationRequest-cl-ips",
    ],
  },
  AllergyIntolerance: {
    AllergyIntolerance: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/AllergiaInt-cl-ips",
    ],
  },
  ProblemList: {
    Condition: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Condition-cl-ips"],
  },
  Procedures: {
    Procedure: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Procedimientos-cl-ips"],
  },
  Immunizations: {
    Immunization: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Inmunizacion-cl-ips"],
  },
  MedicalDevices: {
    DeviceUseStatement: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Declaracion-uso-dispositivo-cl-ips",
    ],
  },
  DiagnosticResults: {
    DiagnosticReport: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/DiagnosticReport-cl-ips",
    ],
    Observation: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-laboratorio-patologico-cl-ips",
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-radiology-cl-ips",
    ],
  },
  VitalSigns: { Observation: ["http://hl7.org/fhir/StructureDefinition/vitalsigns"] },
  IllnessHistory: {
    Condition: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Condition-cl-ips"],
  },
  StatusFunctional: {
    Condition: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Condition-cl-ips",
    ],
    ClinicalImpression: [
      "http://hl7.org/fhir/StructureDefinition/ClinicalImpression"
    ]
  },
  Pregnancy: {
    Observation: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-estado-del-embarazo-cl-ips",
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-del-embarazo-cl-ips",
    ],
  },
  CarePlan: {
    CarePlan: [
      "http://hl7.org/fhir/StructureDefinition/CarePlan"  
    ]
  },
  SocialHistory: {
    Observation: [
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-uso-de-tabaco-cl-ips",
      "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-uso-de-alcohol-cl-ips",
    ],
  },
  Alerts: {
    Flag: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Flag-alerta-cl-ips"]
  },
  AdvancedDirectives: {
    Consent: [
      "http://hl7.org/fhir/StructureDefinition/Consent"
    ]
  }
};

const findIntersection = (
  sectionProfiles: Array<string>,
  resourceProfiles: Array<string>
) => sectionProfiles.find((profile) => resourceProfiles.includes(profile));

const validateByAidbox = async (
  http: HttpClient,
  resource: DomainResource,
  resourceType: string,
  sectionProfile: string
) => {
  return http.post(`fhir/${resourceType}/$validate`, {
    searchParams: {
      "profile": sectionProfile
    },
    json: resource,
  });
}

const getSectionResources = (
  patientData: PatientData,
  sectionsProfiles: Record<string, Array<string>>
) => {
  return patientData.reduce((acc: PatientData, { resource }) => {
    const rightResourceType = Object.keys(sectionsProfiles).includes(
      resource.resourceType
    );

    if (rightResourceType) {
      acc.push({ resource });
    }
    return acc;
  }, []);
};

// ----- Required sections -----
const generateProblemListSection = (patientData: PatientData) => {
  const validConditions = getSectionResources(patientData, sectionProfiles.ProblemList);

  const section = {
    title: "Problemas de Salud",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11450-4",
          display: "Lista de problemas",
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
    title: "Alergias e Intolerancias",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "48765-2",
          display: "Alergias y reacciones adversas",
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
    title: "Resumen de Medicamentos IPS",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "10160-0",
          display: "Antecedentes de consumo de medicaciones",
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
    title: "Inmunizaciones",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11369-6",
          display: "Antecedente de inmunización",
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
    title: "Procedimientos",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "47519-4",
          display: "Historia de los procedimientos",
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
    title: "Dispositivos Médicos",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "46264-8",
          display: "Historial de uso de dispositivos médicos",
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
    title: "Resultados",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "30954-2",
          display: "Pruebas diagnósticas relevantes y/o información de laboratorio",
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
    title: "Signos Vitales",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8716-3",
          display: "Hallazgos físicos",
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
    title: "Historial de Embarazos",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "10162-6",
          display: "Antecedentes de embarazos",
        },
      ],
    },
    text: generateSimpleNarrative(validObservations as SimpleNarrativeEntry),
  };

  return buildSection(section, validObservations);
};

const generateAlertsSection = (patientData: PatientData, http: HttpClient) => {
  const resources = getSectionResources(
    patientData,
    sectionProfiles.Alerts
  );

  const section = {
    title: "Flag - Alertas",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "104605-1",
          display: "Alerta",
        },
      ],
    },
    text: generateSimpleNarrative(resources as SimpleNarrativeEntry),
  };

  return buildSection(section, resources);
};

const generateCarePlanSection = (patientData: PatientData, http: HttpClient) => {
  const resources = getSectionResources(
    patientData,
    sectionProfiles.CarePlan
  );

  const section = {
    title: "Plan de Cuidado",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "18776-5",
          display: "Plan de tratamiento",
        },
      ],
    },
    text: generateSimpleNarrative(resources as SimpleNarrativeEntry),
  };

  return buildSection(section, resources);
};

const generateAdvencedDirectivesSection = (patientData: PatientData, http: HttpClient) => {
  const resources = getSectionResources(
    patientData,
    sectionProfiles.AdvancedDirectives
  );

  const section = {
    title: "Sección de Consentimientos",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "42348-3",
          display: "Directivas avanzadas",
        },
      ],
    },
    text: generateSimpleNarrative(resources as SimpleNarrativeEntry),
  };

  return buildSection(section, resources);
};

const generateSocialHistorySection = (patientData: PatientData, http: HttpClient) => {
  const validObservations = getSectionResources(
    patientData,
    sectionProfiles.SocialHistory
  );

  const section = {
    title: "Historia Social",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "29762-2",
          display: "Antecedentes sociales",
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
    title: "Histórico de enfermedades",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11348-0",
          display: "Antecedentes de enfermedades pasadas",
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
  "Alerts",
  "CarePlan",
  "AdvancedDirectives"
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
  Alerts: generateAlertsSection, 
  CarePlan: generateCarePlanSection,
  AdvancedDirectives: generateAdvencedDirectivesSection
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

const buildQueryForSection = (
  resourceType: string,
  patientId: string
): string => {
    return `/fhir/${resourceType}?patient=${patientId}`;
};

const fetchSummaryResources = async (http: HttpClient, patientId: string) => {
  const resourceTypes = sectionNames.reduce((acc: Set<string>, sectionName) => {

    Object.keys(sectionProfiles[sectionName]).map(
      (resourceType) => acc.add(resourceType)
    );

    return acc;
  }, new Set<string>());

  const entries = [...resourceTypes].map((resourceType) => ({
    request: { method: "GET", url: buildQueryForSection(resourceType, patientId) },
  }));

  const { response }: any = await http.post("", {
    json: {
      resourceType: "Bundle",
      type: "transaction",
      entry: entries,
    },
  });


  return response.data?.entry?.reduce((acc: PatientData, item: any) => {
    if (item.resource?.total > 0) {
      acc.push(...item.resource?.entry);
    }
    return acc;
  }, []);
};

const filterResourcesByProfiles = async (http: HttpClient, patientData: PatientData) => {
  const newPatientData: PatientData = [];
  const profileData: Record<string, Array<string>> = {};

  for (const resource of patientData) {
    let verifiedOnce = false;
    const resourceType = resource.resource.resourceType;

    for (const sectionName of sectionNames) {
      const sectionProfileEntries = Object.entries(sectionProfiles[sectionName]);

      for (const [profileResourceType, profiles] of sectionProfileEntries) {
        if (resourceType === profileResourceType) {
          for (const profile of profiles as Array<string>) {
            const result = await validateByAidbox(http, resource.resource, resourceType, profile);
            const validationResult = (result.response.data as Record<string, any>)["id"] as string;
            if (validationResult === "allok") {
              verifiedOnce = true;

              if (!profileData[sectionName]) {
                profileData[sectionName] = [];
              }
              profileData[sectionName].push(buildReference(resourceType, resource.resource.id!));
            }
          }
        }
      }
    }

    if (verifiedOnce) {
      newPatientData.push(resource);
    }
  }

  return { patientData: newPatientData, profileData: profileData };
};

export const generateSections = async (http: HttpClient, patientId: string) => {
  const resources = await fetchSummaryResources(http, patientId);
  const {patientData, profileData} = await filterResourcesByProfiles(http, resources);
  const sections = sectionNames.reduce((acc: any, item) => {
    const section = sectionToGenerateFuncMap[item](patientData, http);

    if (section) {
      acc.push(section);
    }

    return acc;
  }, []);

  return { sections, bundleData: patientData };
};

const getRefs = (data: Array<{ reference: string }>) =>
  data.map(({ reference }) => reference);

export const getResourcesFromRefs = async (
  http: HttpClient,
  patientData: PatientData
) => {
  const { refs, bundleResources } = patientData.reduce(
    (acc: { refs: Array<string>; bundleResources: Array<string> }, { resource }: any) => {
      const performerRef = resource.performer ? getRefs(resource.performer) : [];
      const partOfRef = resource.partOf ? getRefs(resource.partOf) : [];
      const hasMemberRef = resource.hasMember ? getRefs(resource.hasMember) : [];
      const deviceRef = resource.device?.reference ? [resource.device?.reference] : [];
      const medicationRef = resource.medicationReference?.reference
        ? [resource.medicationReference?.reference]
        : [];
      const resourceRef = `${resource.resourceType}/${resource.id}`;
      return {
        refs: [
          ...acc.refs,
          ...performerRef,
          ...partOfRef,
          ...hasMemberRef,
          ...deviceRef,
          ...medicationRef,
        ],
        bundleResources: [...acc.bundleResources, resourceRef],
      };
    },
    {
      refs: [],
      bundleResources: [],
    }
  );

  const uniqueRefs = [...new Set(refs)];
  const missingRefs = uniqueRefs.filter((ref) => bundleResources.indexOf(ref) < 0);

  const bundleEntry = missingRefs.reduce(
    (acc: BundleEntry, ref: string) => {
      acc.push({
        request: { method: "GET", url: `/fhir/${ref}` },
      });
      return acc;
    },
    [
      {
        request: { method: "GET", url: "/fhir/Organization/TII-Organization1dddd" },
      },
    ]
  );

  const { response }: any = await http.post("", {
    json: {
      resourceType: "Bundle",
      type: "batch",
      entry: bundleEntry,
    },
  });

  return response.data?.entry?.reduce((acc: PatientData, item: any) => {
    if (item.response?.status == 200) {
      acc.push({ resource: item.resource });
    }
    return acc;
  }, []);
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
