import axios, { AxiosInstance } from 'axios';
import { Config } from '../types/config';
import {
  FHIRResource,
} from '../types/health-card';

export class FHIRClient {
  private client: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.aidbox.baseUrl,
      auth: {
        username: config.aidbox.clientId,
        password: config.aidbox.clientSecret,
      },
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });
  }

  async getPatient(patientId: string): Promise<FHIRResource> {
    try {
      const response = await this.client.get(`/Patient/${patientId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch patient ${patientId}: ${error}`);
    }
  }

  async getImmunizations(
    patientId: string,
    since?: string
  ): Promise<FHIRResource[]> {
    try {
      let url = `/Immunization?patient=${patientId}`;
      if (since) {
        url += `&_lastUpdated=ge${since}`;
      }

      const response = await this.client.get(url);
      const bundle = response.data;

      if (bundle.entry) {
        return bundle.entry.map((entry: any) => entry.resource);
      }
      return [];
    } catch (error) {
      throw new Error(
        `Failed to fetch immunizations for patient ${patientId}: ${error}`
      );
    }
  }

  async getObservations(
    patientId: string,
    since?: string
  ): Promise<FHIRResource[]> {
    try {
      let url = `/Observation?subject=Patient/${patientId}`;
      if (since) {
        url += `&_lastUpdated=ge${since}`;
      }

      const response = await this.client.get(url);
      const bundle = response.data;

      if (bundle.entry) {
        return bundle.entry.map((entry: any) => entry.resource);
      }
      return [];
    } catch (error) {
      throw new Error(
        `Failed to fetch observations for patient ${patientId}: ${error}`
      );
    }
  }

  async getResourcesByType(
    patientId: string,
    credentialTypes: string[],
    since?: string
  ): Promise<FHIRResource[]> {
    const resources: FHIRResource[] = [];

    for (const type of credentialTypes) {
      switch (type.toLowerCase()) {
        case 'immunization':
          const immunizations = await this.getImmunizations(patientId, since);
          resources.push(...immunizations);
          break;
        case 'observation':
          const observations = await this.getObservations(patientId, since);
          resources.push(...observations);
          break;
        default:
          // eslint-disable-next-line no-console
          console.warn(`Unsupported credential type: ${type}`);
      }
    }

    return resources;
  }
}
