import { randomUUID } from "node:crypto";
import { FastifyReply } from "fastify";
import { Request } from "./types";
import {
  generateSections,
  createComposition,
  addFullUrl,
  getResourcesFromRefs,
} from "./ips.js";

export const patientSummary = {
  method: "GET",
  fhirCode: "summary",
  fhirUrl: "http://hl7.org/fhir/uv/ips/OperationDefinition/summary",
  fhirResource: ["Patient"],
  path: ["fhir", "Patient", { name: "id" }, "$summary"],
  handlerFn: async (
    { aidboxClient, http, body, appConfig }: Request,
    reply: FastifyReply
  ) => {
    try {
      const patientId: string = body?.request?.["route-params"].id;
      const patient = await aidboxClient.resource.get("Patient", patientId);

      const { sections, bundleData }: any = await generateSections(http, patientId);
      const composition = createComposition(sections, patientId);
      const refResources = await getResourcesFromRefs(http, bundleData);

      return reply.send({
        resourceType: "Bundle",
        type: "document",
        timestamp: new Date().toISOString(),
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips"],
        },
        identifier: { system: "urn:oid:2.16.724.4.8.10.200.10", value: randomUUID() },
        entry: [
          {
            resource: composition,
            fullUrl: `${appConfig.aidbox.url}/fhir/Composition/${composition.id}`,
          },
          {
            resource: patient,
            fullUrl: `${appConfig.aidbox.url}/fhir/Patient/${patient.id}`,
          },
          ...addFullUrl([...bundleData, ...refResources], appConfig.aidbox.url),
        ],
      });
    } catch (error: any) {
      console.log(error);
      return reply.send(error.response);
    }
  },
};
