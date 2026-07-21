import axios, { AxiosInstance } from 'axios';
import { Config } from '../types/config';
import {
  FHIRResource,
} from '../types/health-card';
import { COVID19_CREDENTIAL_TYPE } from '../utils/credential-utils';

// CVX codes for COVID-19 vaccines (used to filter Immunizations for #covid19).
const COVID19_CVX_CODES = [
  '207', '208', '210', '211', '212', '213', '217', '218', '219', '221',
  '225', '227', '228', '229', '230', '300', '301', '302',
];

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

  /**
   * True if `system|code` is a member of the ValueSet, via Aidbox terminology
   * (`ValueSet/$validate-code`). Used to filter resources by `credentialValueSet`.
   */
  async validateCode(
    valueSetUrl: string,
    system: string,
    code: string
  ): Promise<boolean> {
    try {
      const response = await this.client.get('/ValueSet/$validate-code', {
        params: { url: valueSetUrl, system, code },
      });
      const result = (response.data?.parameter || []).find(
        (p: any) => p.name === 'result'
      );
      return result?.valueBoolean === true;
    } catch {
      return false;
    }
  }

  async listPatients(): Promise<Array<{ id: string; label: string }>> {
    try {
      const response = await this.client.get('/Patient?_count=50&_elements=name');
      const bundle = response.data;
      return (bundle.entry || []).map((entry: any) => {
        const p = entry.resource;
        const n = Array.isArray(p.name) ? p.name[0] : undefined;
        const name = n ? `${(n.given || []).join(' ')} ${n.family || ''}`.trim() : '';
        return { id: p.id, label: name ? `${name} (${p.id})` : p.id };
      });
    } catch {
      return [];
    }
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
      // VCI covid19 credential → COVID-19 Immunizations only.
      if (type === COVID19_CREDENTIAL_TYPE) {
        const immunizations = await this.getImmunizations(patientId, since);
        resources.push(...immunizations.filter(isCovid19Immunization));
        continue;
      }

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

/**
 * True when the Immunization carries a CVX code known to be a COVID-19 vaccine.
 */
function isCovid19Immunization(immunization: FHIRResource): boolean {
  const codings = immunization?.vaccineCode?.coding;
  if (!Array.isArray(codings)) return false;
  return codings.some(
    (c: any) =>
      c?.system === 'http://hl7.org/fhir/sid/cvx' &&
      COVID19_CVX_CODES.includes(String(c?.code))
  );
}
