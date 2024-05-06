import { randomUUID } from "node:crypto";
import { FastifyReply } from "fastify";
import { Request } from "./types";
import { generateSections, createComposition, removeDuplicatedResources } from "./ips.js";

export const patientSummary = {
  method: "GET",
  fhirCode: "summary",
  fhirUrl: "http://hl7.org/fhir/uv/ips/OperationDefinition/summary",
  fhirResource: ["Patient"],
  path: ["fhir", "Patient", { name: "id" }, "$summary"],
  handlerFn: async ({ http, body, appConfig }: Request, reply: FastifyReply) => {
    try {
      const patientId = body?.request?.["route-params"].id;
      // TODO: rewrite with _include/_revinclude when medication search param is fixed
      const {
        response: { data },
      }: any = await http.get(`fhir/Patient/${patientId}/$everything`);
      const patient = data.entry[0];
      const { sections, bundleData }: any = await generateSections(data.entry, http);
      const composition = createComposition(sections, patientId);

      return reply.send({
        resourceType: "Bundle",
        type: "document",
        timestamp: new Date().toISOString(),
        identifier: { system: "urn:oid:2.16.724.4.8.10.200.10", value: randomUUID() },
        entry: [
          {
            resource: composition,
            fullUrl: `${appConfig.aidbox.url}/fhir/Composition/${composition.id}`,
          },
          {
            resource: patient.resource,
            fullUrl: `${appConfig.aidbox.url}/fhir/Patient/${patient.resource.id}`,
          },
          ...removeDuplicatedResources(bundleData, appConfig.aidbox.url),
        ],
      });
    } catch (error: any) {
      // TODO: handle errors properly
      console.log(error);
      if (error.response?.status === 404) {
        return reply.send(error.response.data); //FIX: return status 404
      }
      return reply.send("");
    }
  },
};
