"use server";

import Client from "fhirclient/lib/Client";
import {
  Bundle,
  Encounter,
  Identifier,
  Patient,
  Practitioner,
  RelatedPerson,
  Resource,
} from "fhir/r4";
import { getOrganizationalAidbox, upsertOrganization } from "@/lib/aidbox";
import { getCapabilityStatement } from "@/lib/smart";
import { readableStreamToObject } from "@/lib/utils";

function isBundle(resource: Resource): resource is Bundle<Resource> {
  return "resourceType" in resource && resource.resourceType === "Bundle";
}

async function extractPatient(client: Client) {
  const patient = await client.patient.read().catch((e) => {
    console.error(`Failed to read patient from launch context: ${e.message}`);
  });

  return patient as Patient;
}

async function extractUser(client: Client) {
  const user = await client.user.read().catch((e) => {
    console.error(`Failed to read user from launch context: ${e.message}`);
  });

  return user as Patient | Practitioner | RelatedPerson;
}

async function extractEncounter(client: Client) {
  const encounter = await client.encounter.read().catch((e) => {
    console.error(`Failed to read encounter from launch context: ${e.message}`);
  });

  return encounter as Encounter;
}

async function extractEverything(client: Client, patient: Patient) {
  const bundle = await client
    .request<Bundle<Resource>>(`/Patient/${patient.id}/$everything`)
    .catch((e) => {
      console.error(`Failed to read $everything: ${e.message}`);
    });

  const resources = [] as Resource[];
  for (const { resource } of bundle?.entry || []) {
    if (resource && "resourceType" in resource && "id" in resource) {
      resources.push(resource);
    }
  }

  return resources;
}

type FhirContext = {
  reference?: string;
  canonical?: string;
  identifier?: Identifier;
  type?: string;
  role?: string;
};

function queryFhirContext(
  client: Client,
  { type, canonical, identifier, reference }: FhirContext,
): Promise<Resource | Bundle<Resource>> | undefined {
  if (reference) {
    return client.request(reference);
  }

  if (canonical) {
    const [url, version] = canonical.split("|");

    if (url) {
      if (type) {
        const params = new URLSearchParams();
        params.set("url", url);
        if (version) {
          params.set("version", version);
        }

        return client.request(`/${type}?${params}`);
      }
      return client.request(url);
    }
  }

  if (identifier && type) {
    let param = identifier.system;
    if (param && identifier.value) {
      param += `|${identifier.value}`;
    }

    if (param) {
      const params = new URLSearchParams();
      params.set("identifier", param);
      return client.request(`/${type}?${params}`);
    }
  }
}

async function extractFhirContext(client: Client) {
  const { fhirContext } = (client.state.tokenResponse || {}) as {
    fhirContext?: FhirContext[];
  };

  const resources = [] as Resource[];

  for (const context of fhirContext || []) {
    const response = await queryFhirContext(client, context);
    if (response) {
      if (isBundle(response)) {
        for (const { resource } of response.entry || []) {
          if (resource && "resourceType" in resource && "id" in resource) {
            resources.push(resource);
          }
        }
      } else if ("resourceType" in response && "id" in response) {
        resources.push(response);
      }
    }
  }

  return resources;
}

export async function sync(client: Client) {
  const resources = [] as Resource[];

  const patient = await extractPatient(client);
  if (patient) {
    resources.push(patient);
  }

  const user = await extractUser(client);
  if (user && user.resourceType !== "Patient") {
    resources.push(user);
  }

  const encounter = await extractEncounter(client);
  if (encounter) {
    resources.push(encounter);
  }

  const contextResources = await extractFhirContext(client);
  resources.push(...contextResources);

  if (patient) {
    const everything = await extractEverything(client, patient);
    resources.push(...everything);
  }

  await upsertOrganization(await getCapabilityStatement(client));
  const aidbox = await getOrganizationalAidbox(client.state.serverUrl);

  const bundle = {
    resourceType: "Bundle",
    type: "batch",
    entry: resources.map((resource) => ({
      resource,
      request: {
        method: "PUT",
        url: `${resource.resourceType}/${resource.id}`,
      },
    })),
  };

  await aidbox.post("fhir/", { json: bundle }).catch(async (e) => {
    console.error(`Failed to post bundle to Aidbox: ${e.message}`);
    console.dir(bundle, { depth: null });

    if (e?.response?.body instanceof ReadableStream) {
      const body = await readableStreamToObject(e.response.body);
      console.dir(body, { depth: null });
    }
  });

  return resources;
}
