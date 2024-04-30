import { FastifyReply } from "fastify";
import { Request } from "./types";
import { generateSections, createComposition, removeDuplicatedResources } from "./ips.js";

export const patientSummary = {
  method: "GET",
  path: ["Patient", { name: "id" }, "$summary"],
  handlerFn: async ({ http, body }: Request, reply: FastifyReply) => {
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
        entry: [composition, patient, ...removeDuplicatedResources(bundleData)],
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
