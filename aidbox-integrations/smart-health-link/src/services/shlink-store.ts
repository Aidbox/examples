import type { FhirClient } from './fhir-client.ts';
import type { SHLinkResource } from '../types/shlink-resource.ts';

/** Persistence for the SHLink custom resource. */
export class SHLinkStore {
  constructor(private readonly fhir: FhirClient) {}

  create(resource: Omit<SHLinkResource, 'resourceType' | 'id'>): Promise<SHLinkResource> {
    return this.fhir.create<SHLinkResource>('SHLink', {
      resourceType: 'SHLink',
      ...resource,
    });
  }

  get(id: string): Promise<SHLinkResource | null> {
    return this.fhir.read<SHLinkResource>('SHLink', id);
  }

  save(resource: SHLinkResource): Promise<SHLinkResource> {
    if (!resource.id) throw new Error('Cannot save SHLink without id');
    return this.fhir.put<SHLinkResource>('SHLink', resource.id, resource);
  }
}
