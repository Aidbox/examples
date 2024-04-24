import { FastifyReply } from "fastify";
import { Request } from "./types";
import { createComposition } from "./utils.js";

const resourceToSearchParam = {
  MedicationStatement: "_revinclude=MedicationStatement:patient",
  MedicationRequest: "_revinclude=MedicationRequest:patient",
  MedicationAdministration: "_revinclude=MedicationAdministration:patient",
  MedicationDispense: "_revinclude=MedicationDispense:patient",
  AllergyIntolerance: "_revinclude=AllergyIntolerance:patient",
  Immunization: "_revinclude=Immunization:patient",
  Procedure: "_revinclude=Procedure:patient",
  DeviceUseStatement: "_revinclude=DeviceUseStatement:patient",
  DiagnosticReport: "_revinclude=DiagnosticReport:patient",
  ClinicalImpression: "_revinclude=ClinicalImpression:patient",
  CarePlan: "_revinclude=CarePlan:patient",
  Consent: "_revinclude=Consent:patient",
  Condition: "code=11348-0,11450-4",
  Observation: "code=85353-1,8716-3,30954-2,10162-6,29762-2",
};

const summaryResources: Array<keyof typeof resourceToSearchParam> = [
  "MedicationStatement",
  "MedicationRequest",
  "MedicationAdministration",
  "MedicationDispense",
  "AllergyIntolerance",
  "Immunization",
  "Procedure",
  "DeviceUseStatement",
  "DiagnosticReport",
  "ClinicalImpression",
  "CarePlan",
  "Consent",
  "Observation",
  "Condition",
];

export const patientSummary = {
  method: "GET",
  path: ["Patient", { name: "id" }, "$summary"],
  handlerFn: async ({ http, body }: Request, reply: FastifyReply) => {
    const patientId = body?.request?.["route-params"].id;
    const searchUrls = summaryResources.reduce(
      (acc, resourceType) => {
        if (["Observation", "Condition"].includes(resourceType)) {
          return {
            ...acc,
            [resourceType]: `${resourceType}?patient=${patientId}&${resourceToSearchParam[resourceType]}`,
          };
        }
        return {
          ...acc,
          other: `${acc.other}&${resourceToSearchParam[resourceType]}`,
        };
      },
      { other: `Patient?_id=${patientId}` }
    );

    const bundleBody = {
      resourceType: "Bundle",
      type: "transaction",
      entry: Object.values(searchUrls).map((searchUrl) => ({
        request: { method: "GET", url: searchUrl },
      })),
    };

    const {
      response: { data },
    }: any = await http.post("", { json: bundleBody });

    const patientData = data.entry.reduce((acc: any, item: any) => {
      if (item.resource.total > 0) {
        acc.push(...item.resource.entry);
      }
      return acc;
    }, []);

    if (patientData.length === 0) {
      return reply.send({
        resourceType: "OperationOutcome",
        id: "not-found",
        text: {
          status: "generated",
          div: `Resource Patient/${patientId} not found`,
        },
        issue: [
          {
            severity: "fatal",
            code: "not-found",
            diagnostics: `Resource Patient/${patientId} not found`,
          },
        ],
      });
    }

    const composition = createComposition(patientData, patientId);

    return reply.send({
      resourceType: "Bundle",
      type: "document",
      entry: [composition, ...patientData],
    });
  },
};
