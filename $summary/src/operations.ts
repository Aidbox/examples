import { FastifyReply } from "fastify";
import { Request } from "./types";

// const createComposition = async (aidboxClient: Client, data: any) => {};

const patientSummary = {
  method: "GET",
  path: ["Patient", { name: "id" }, "$summary"],
  handlerFn: async ({ aidboxClient, body }: Request, reply: FastifyReply) => {
    const patientId = body?.request?.["route-params"].id;

    const query = `SELECT jsonb_build_object(
                      'patient', jsonb_agg(DISTINCT pt.resource || jsonb_build_object('id', pt.id, 'resourceType', pt.resource_type)),
                      'conditions', jsonb_agg(DISTINCT cond.resource || jsonb_build_object('id', cond.id, 'resourceType', cond.resource_type)),
                      'allergies', jsonb_agg(DISTINCT ai.resource || jsonb_build_object('id', ai.id, 'resourceType', ai.resource_type)),
                      'medications', jsonb_agg(DISTINCT med.resource || jsonb_build_object('id', med.id, 'resourceType', med.resource_type)),
                      'medication_statements', jsonb_agg(DISTINCT ms.resource || jsonb_build_object('id', ms.id, 'resourceType', ms.resource_type)),
                      'medication_requests', jsonb_agg(DISTINCT mr.resource || jsonb_build_object('id', mr.id, 'resourceType', mr.resource_type)),
                      'medication_administrations', jsonb_agg(DISTINCT ma.resource || jsonb_build_object('id', ma.id, 'resourceType', ma.resource_type)),
                      'medication_dispenses', jsonb_agg(DISTINCT md.resource || jsonb_build_object('id', md.id, 'resourceType', md.resource_type))
                    ) AS result
                      FROM patient pt
                      LEFT JOIN condition cond ON cond.resource #>> '{subject, id}' = pt.id
                      LEFT JOIN allergyintolerance ai ON ai.resource #>> '{patient, id}' = pt.id
                      LEFT JOIN medicationstatement ms ON ms.resource #>> '{subject, id}' = pt.id
                      LEFT JOIN medicationrequest mr ON mr.resource #>> '{subject, id}' = pt.id
                      LEFT JOIN medicationadministration ma ON ma.resource #>> '{subject, id}' = pt.id
                      LEFT JOIN medicationdispense md ON md.resource #>> '{subject, id}' = pt.id
                      LEFT JOIN medication med ON med.id = ms.resource #>> '{medication, Reference, id}'
                    WHERE pt.id = ?
                    GROUP BY pt.id;`;

    const data: Array<{ result: Array<Record<string, any>> }> = await aidboxClient.rawSQL(query, [
      patientId,
    ]);

    if (data.length === 0) {
      return reply.send({
        resource: {
          resourceType: "Bundle",
          type: "document",
          entry: [],
        },
      });
    }

    return reply.send({
      resource: {
        resourceType: "Bundle",
        type: "document",
        entry: Object.values(data[0].result)
          .reduce((acc: any, item: any) => {
            return [...acc, ...item];
          }, [])
          .filter((item: any) => !!item)
          .map((item: any) => ({ resource: item })),
      },
    });
  },
};

export const operations: Record<string, any> = {
  "patient-summary": patientSummary,
};

export const handleOperation = async (request: Request, reply: FastifyReply) => {
  const { body } = request;
  if (body?.type === "operation" && body?.operation?.id) {
    return operations[body?.operation?.id].handlerFn(request, reply);
  }

  return { response: "Operation not found" };
};
