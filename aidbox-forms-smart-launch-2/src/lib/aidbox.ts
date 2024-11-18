import ky from "ky";
import { Bundle, Organization, Patient, Practitioner } from "fhir/r4";
import { sha256 } from "@/lib/utils";

interface Meta {
  lastUpdated: string;
  createdAt: string;
  versionId: string;
}

interface CommonSearchParams {
  _count?: number;
  _page?: number;
}

interface PatientSearchParams extends CommonSearchParams {
  name?: string;
  given?: string;
  family?: string;
  gender?: "male" | "female" | "other" | "unknown";
}

interface GetPractitionersParams extends CommonSearchParams {
  name?: string;
  gender?: string;
}

interface PractitionerBundle {
  entry: { resource: Practitioner }[];
  total: number;
}

export const api = ky.extend({
  prefixUrl: process.env.AIDBOX_BASE_URL,
  headers: {
    Authorization:
      "Basic " +
      btoa(
        `${process.env.AIDBOX_CLIENT_ID}:${process.env.AIDBOX_CLIENT_SECRET}`,
      ),
  },
});

export function createOrganization(serverUrl: string) {
  const id = sha256(serverUrl);

  return api
    .put(`Organization/${id}`, {
      json: {
        id,
        resourceType: "Organization",
        name: serverUrl,
      },
    })
    .json<Organization>();
}

export function getOrganization(serverUrl: string) {
  const id = sha256(serverUrl);

  return api.get(`Organization/${id}`).json<Organization>();
}

export function getPatients(params?: PatientSearchParams) {
  const searchParams = new URLSearchParams();
  if (params?._count) {
    searchParams.set("_count", params._count.toString());
  }
  if (params?._page) {
    searchParams.set("_page", params._page.toString());
  }
  if (params?.name) {
    searchParams.set("name", params.name);
  }
  if (params?.given) {
    searchParams.set("given", params.given);
  }
  if (params?.family) {
    searchParams.set("family", params.family);
  }
  if (params?.gender) {
    searchParams.set("gender", params.gender);
  }
  return api
    .get(`fhir/Patient?${searchParams.toString()}`)
    .json<Bundle<Patient>>();
}

export async function getPractitioners(params: GetPractitionersParams = {}) {
  const searchParams = new URLSearchParams();
  if (params?._count) {
    searchParams.set("_count", params._count.toString());
  }
  if (params?._page) {
    searchParams.set("_page", params._page.toString());
  }
  if (params?.name) {
    searchParams.set("name", params.name);
  }
  if (params?.gender) {
    searchParams.set("gender", params.gender);
  }
  return api
    .get(`fhir/Practitioner?${searchParams.toString()}`)
    .json<PractitionerBundle>();
}
