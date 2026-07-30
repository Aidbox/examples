import type { FhirClient } from './fhir-client.ts';
import type { AssessmentShareResource } from '../types/assessment-share-resource.ts';

/** Persistence for the AssessmentShare custom resource. */
export class ShareStore {
  constructor(private readonly fhir: FhirClient) {}

  create(
    resource: Omit<AssessmentShareResource, 'resourceType' | 'id'>
  ): Promise<AssessmentShareResource> {
    return this.fhir.create<AssessmentShareResource>('AssessmentShare', {
      resourceType: 'AssessmentShare',
      ...resource,
    });
  }

  get(id: string): Promise<AssessmentShareResource | null> {
    return this.fhir.read<AssessmentShareResource>('AssessmentShare', id);
  }

  save(resource: AssessmentShareResource): Promise<AssessmentShareResource> {
    if (!resource.id) throw new Error('Cannot save AssessmentShare without id');
    return this.fhir.put<AssessmentShareResource>('AssessmentShare', resource.id, resource);
  }

  /** All shares, newest first — the sharing organization's dashboard view. */
  list(): Promise<AssessmentShareResource[]> {
    return this.fhir.search<AssessmentShareResource>('AssessmentShare', [
      ['_sort', '-lastUpdated'],
      ['_count', '50'],
    ]);
  }
}
