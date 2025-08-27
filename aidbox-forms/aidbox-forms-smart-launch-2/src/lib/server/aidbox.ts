import ky from "ky";
import { CapabilityStatement, Organization } from "fhir/r4";
import { sha256 } from "@/lib/utils";
import assert from "node:assert";
import { cache } from "react";

export const aidbox = ky.extend({
  prefixUrl: process.env.AIDBOX_BASE_URL,
  headers: {
    Authorization:
      "Basic " +
      btoa(
        `${process.env.AIDBOX_CLIENT_ID}:${process.env.AIDBOX_CLIENT_SECRET}`,
      ),
  },
});

export const upsertOrganization = async (
  capabilityStatement: CapabilityStatement,
) => {
  const serverUrl = capabilityStatement?.implementation?.url;
  assert(serverUrl, "Server URL is required");

  const id = sha256(serverUrl);

  const software =
    `${capabilityStatement.software?.name || ""} ${capabilityStatement.software?.version || ""}`.trim() ||
    "";

  const implementation =
    `${capabilityStatement.implementation?.description || ""}`.trim() || "";

  const fhirVersion = capabilityStatement.fhirVersion || "";

  const name =
    `${software} ${implementation} ${fhirVersion}`
      .replace(/\s+/g, " ")
      .trim() || "Unknown";

  return aidbox
    .put(`Organization/${id}`, {
      json: {
        id,
        resourceType: "Organization",
        name,
        identifier: [
          { system: "aidbox-forms-smart-launch-2", value: serverUrl },
        ],
      },
    })
    .json<Organization>();
};

export const getOrganizationalAidbox = cache(async (serverUrl: string) => {
  const id = sha256(serverUrl);

  return aidbox.extend({
    prefixUrl: `${process.env.AIDBOX_BASE_URL}/Organization/${id}`,
    hooks: {
      afterResponse: [
        async (request, options, response) => {
          console.log(`[aidbox]`, request.method, request.url);
          console.log(
            "[aidbox]",
            response.status,
            response.headers.get("content-type"),
          );
          console.dir(
            await response
              .clone()
              .json()
              .catch(() => null),
            { depth: 1000 },
          );
        },
      ],
    },
  });
});
