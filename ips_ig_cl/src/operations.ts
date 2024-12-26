import { randomUUID } from "node:crypto";
import assert from "node:assert";
import { FastifyReply } from "fastify";
import { Request } from "./types";
import {
  generateSections,
  createComposition,
  addFullUrl,
  getResourcesFromRefs,
} from "./ips.js";
import { Patient } from "@aidbox/sdk-r4/types";

const getError = (error: any) => (error.response ? error.response : error);

const generateSummary = async ({ http, appConfig }: Request, patient: Patient) => {
  try {
    assert(patient.id, "Patient Id is required");
    const patientId = patient.id;
    console.log('patient.id', patient.id);
    const { sections, bundleData }: any = await generateSections(http, patientId);
    console.log(bundleData);
    const composition = createComposition(sections, patientId);
    const refResources = await getResourcesFromRefs(http, bundleData);

    return {
      resourceType: "Bundle",
      type: "document",
      timestamp: new Date().toISOString(),
      meta: {
        profile: ["https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Bundle-documento-ips-cl"],
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
    };
  } catch (error: any) {
    console.log(error);
    return getError(error);
  }
};

export const patientSummary = {
  method: "GET",
  fhirCode: "summary",
  fhirUrl: "http://hl7.org/fhir/uv/ips/OperationDefinition/summary",
  fhirResource: ["Patient"],
  path: ["fhir", "Patient", { name: "id" }, "$summary"],
  handlerFn: async (req: Request, reply: FastifyReply) => {
    try {
      const patientId: string = req.body?.request?.["route-params"].id;
      const patient = await req.aidboxClient.resource.get("Patient", patientId);
      const summary = await generateSummary(req, patient);
      return reply.send(summary);
    } catch (error: any) {
      console.log(error);
      return reply.send(getError(error));
    }
  },
};

export const patientSummarySearch = {
  method: "GET",
  fhirCode: "summary",
  fhirUrl: "http://hl7.org/fhir/uv/ips/OperationDefinition/summary",
  fhirResource: ["Patient"],
  path: ["fhir", "Patient", "$summary"],
  handlerFn: async (req: Request, reply: FastifyReply) => {
    console.log(req);
    try {
      const patientIdentifier = req.body?.request?.params?.identifier;

      if (!patientIdentifier) {
        return reply.code(400).send({
          resourceType: "OperationOutcome",
          text: "Search parameter 'identifier' is required",
        });
      }

      const data = await req.aidboxClient.resource
        .list("Patient")
        .where("identifier", patientIdentifier);

      if (!data.entry || data.total == 0) {
        return reply.code(404).send({
          resourceType: "OperationOutcome",
          id: "NotFound",
          text: {
            status: "generated",
            div: `Resource Patient?identifier=${patientIdentifier} not found`,
          },
        });
      }

      const summary = await generateSummary(req, data.entry[0]?.resource);
      return reply.send(summary);
    } catch (error: any) {
      console.log(error);
      return reply.send(getError(error));
    }
  },
};
