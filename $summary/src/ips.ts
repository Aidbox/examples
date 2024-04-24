import { randomUUID } from "node:crypto";
import { generateCompositionNarrative, generateConditionNarrative } from "./narrative.js";
import { HttpClient, PatientData } from "./types";

const validateResources = async (
  resources: PatientData,
  resourceType: string,
  profile: string,
  http: HttpClient
) => {
  let result = [];
  for (const { resource } of resources) {
    if (resource.resourceType !== resourceType) continue;
    const { response }: any = await http.post(
      `fhir/${resourceType}/${resource.id}/$validate?mode=profile&profile=${profile}`,
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
    "Condition",
    "http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips",
    http
  );
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
    text: generateConditionNarrative(validConditions),
    entry: validConditions.map((condition) => ({
      reference: `Condition/${condition.resource.id}`,
    })),
  };

  return { section: section, bundleData: validConditions };
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
    text: generateConditionNarrative(validConditions),
    entry: validConditions.map((condition) => ({
      reference: `Condition/${condition.resource.id}`,
    })),
  };

  return { section: section, bundleData: validConditions };
};

const sectionNames = ["ProblemList", "IllnessHistory"];
const sectionToGenerateFuncMap: any = {
  ProblemList: generateProblemListSection,
  IllnessHistory: generateIllnessHistorySection,
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
    async (previousPromise: any, item) => {
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
  const medicationResources = [
    "MedicationStatement",
    "MedicationRequest",
    "MedicationAdministration",
    "MedicationDispense",
  ];

  const narrative = {
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
    ...narrative,
    text: generateCompositionNarrative({
      id: narrative.id,
      status: narrative.status,
      title: narrative.title,
      eventDate: narrative.event[0].period.end,
    }),
  };
};
