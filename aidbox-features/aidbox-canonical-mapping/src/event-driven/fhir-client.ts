/**
 * FHIR Client
 * Stores FHIR resources in Aidbox FHIR R4 server using basic auth
 */

import type { Patient } from "../fhir-types/hl7-fhir-r4-core/Patient";
import type { Encounter } from "../fhir-types/hl7-fhir-r4-core/Encounter";
import type { Location } from "../fhir-types/hl7-fhir-r4-core/Location";
import type { Resource } from "../fhir-types/hl7-fhir-r4-core/Resource";

export class FhirClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(baseUrl: string, clientId: string, clientSecret: string) {
    this.baseUrl = baseUrl;
    this.authHeader = "Basic " + btoa(`${clientId}:${clientSecret}`);
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    return globalThis.fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: this.authHeader,
      },
    });
  }

  /**
   * Create or update a resource using PUT
   */
  async upsert<T extends Resource>(resource: T): Promise<T> {
    const url = `${this.baseUrl}/fhir/${resource.resourceType}/${resource.id}`;

    console.log(`[FhirClient] PUT ${url}`);

    const response = await this.fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/fhir+json",
        Accept: "application/fhir+json",
      },
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR Server error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async storePatient(patient: Patient): Promise<Patient> {
    return this.upsert(patient);
  }

  async storeEncounter(encounter: Encounter): Promise<Encounter> {
    return this.upsert(encounter);
  }

  async storeLocation(location: Location): Promise<Location> {
    return this.upsert(location);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch(`${this.baseUrl}/fhir/metadata`, {
        headers: { Accept: "application/fhir+json" },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createFhirClient(): FhirClient {
  const baseUrl = process.env.FHIR_SERVER_URL ?? "http://localhost:8080";
  const clientId = process.env.AIDBOX_CLIENT_ID ?? "root";
  const clientSecret = process.env.AIDBOX_CLIENT_SECRET ?? "secret";

  return new FhirClient(baseUrl, clientId, clientSecret);
}
