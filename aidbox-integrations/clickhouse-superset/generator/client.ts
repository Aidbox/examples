import type { HeadersInit } from 'bun';
import type { Appointment } from './fhir.r4.sdk/types/hl7-fhir-r4-core/Appointment';

// HTTP Client for Aidbox API
const AIDBOX_BASE_URL = 'http://localhost:8888';

interface AidboxRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    queryParams?: Record<string, string | number | boolean>;
}

export class AidboxClient {
    private baseUrl: string;
    private authHeader: string;

    constructor(authHeader: string, baseUrl: string = AIDBOX_BASE_URL) {
        this.baseUrl = baseUrl;
        this.authHeader = authHeader;
    }

    private buildUrl(path: string, queryParams?: Record<string, string | number | boolean>): string {
        const url = new URL(path, this.baseUrl);
        if (queryParams) {
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }
        return url.toString();
    }

    async request<T = any>(path: string, options: AidboxRequestOptions = {}): Promise<T> {
        const { method = 'GET', body, queryParams } = options;
        const url = this.buildUrl(path, queryParams);

        const headers: HeadersInit = {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
        };

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);



        if (!response.ok) {

            const x = await response.json();
            console.log(x);

            throw new Error(`Aidbox API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as T;
    }

    // FHIR API methods
    async getResource<T = any>(resourceType: string, id: string): Promise<T> {
        return this.request(`/fhir/${resourceType}/${id}`);
    }

    async searchResources<T = any>(resourceType: string, params?: Record<string, string | number | boolean>): Promise<T> {
        return this.request(`/fhir/${resourceType}`, { queryParams: params });
    }

    async createResource<T = any>(resourceType: string, resource: any): Promise<T> {
        return this.request(`/fhir/${resourceType}`, {
            method: 'POST',
            body: resource,
        });
    }

    async updateResource<T = any>(resourceType: string, id: string, resource: any): Promise<T> {
        return this.request(`/fhir/${resourceType}/${id}`, {
            method: 'PUT',
            body: resource,
        });
    }

    async deleteResource(resourceType: string, id: string): Promise<void> {
        return this.request(`/fhir/${resourceType}/${id}`, {
            method: 'DELETE',
        });
    }

    // Convenience methods for common operations
    async getPatient(id: string) {
        return this.getResource('Patient', id);
    }

    async searchPatients(params?: Record<string, string | number | boolean>) {
        return this.searchResources('Patient', params);
    }

    async searchPractitioners(params?: Record<string, string | number | boolean>) {
        return this.searchResources('Practitioner', params);
    }

    async createAppointment(appointment: Appointment) {
        return this.createResource('Appointment', appointment);
    }

    async getAppointment(id: string) {
        return this.getResource('Appointment', id);
    }
}
