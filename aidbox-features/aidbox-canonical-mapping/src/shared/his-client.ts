/**
 * HIS (Hospital Information System) API Client
 * OAuth 2.0 Client Credentials flow with token caching
 */

import type {
  HISTokenResponse,
  CurrentInpatient,
  CurrentInpatientResponse,
  Patient,
} from "./types/his";

// ============ Configuration ============

export interface HISClientConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  environment: string;
  requestingProduct: string;
}

// ============ Token Cache ============

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// ============ HIS Client ============

export class HISClient {
  private config: HISClientConfig;
  private tokenCache: CachedToken | null = null;

  constructor(config: HISClientConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    const bufferMs = 60_000; // Refresh 60s before expiry

    if (this.tokenCache && this.tokenCache.expiresAt > now + bufferMs) {
      return this.tokenCache.accessToken;
    }

    console.log("[HISClient] Fetching new access token...");

    const tokenUrl = `${this.config.baseUrl}/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        environment: this.config.environment,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} - ${error}`);
    }

    const tokenResponse = (await response.json()) as HISTokenResponse;

    this.tokenCache = {
      accessToken: tokenResponse.access_token,
      expiresAt: now + tokenResponse.expires_in * 1000,
    };

    console.log("[HISClient] Token obtained, expires in", tokenResponse.expires_in, "seconds");

    return this.tokenCache.accessToken;
  }

  /**
   * Make an authenticated request to HIS API
   */
  private async request<T>(path: string): Promise<T> {
    const token = await this.getAccessToken();

    const url = `${this.config.baseUrl}${path}`;

    console.log(`[HISClient] GET ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Requesting-Product": this.config.requestingProduct,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HIS API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get current inpatients for a ward
   */
  async getWardPatients(wardId: string): Promise<CurrentInpatient[]> {
    const env = this.config.environment;
    const path = `/api/${env}/Inpatient/v1/Wards/${wardId}/CurrentInpatients`;

    const response = await this.request<CurrentInpatientResponse>(path);
    return response.results ?? [];
  }

  /**
   * Get patient details by PatientId
   */
  async getPatientDetails(patientId: string): Promise<Patient> {
    const env = this.config.environment;
    const path = `/api/${env}/PatientService/v1/Patients/${patientId}`;

    return this.request<Patient>(path);
  }
}

// ============ Factory ============

export function createHISClient(): HISClient {
  const config: HISClientConfig = {
    baseUrl: process.env.HIS_BASE_URL ?? "http://his:4000",
    clientId: process.env.HIS_CLIENT_ID ?? "",
    clientSecret: process.env.HIS_CLIENT_SECRET ?? "",
    environment: process.env.HIS_ENVIRONMENT ?? "TEST",
    requestingProduct: process.env.REQUESTING_PRODUCT ?? "FHIR-Facade/1.0.0",
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error("HIS_CLIENT_ID and HIS_CLIENT_SECRET environment variables are required");
  }

  return new HISClient(config);
}
