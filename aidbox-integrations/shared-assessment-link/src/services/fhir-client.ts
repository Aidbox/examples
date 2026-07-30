import { AidboxClient, BasicAuthProvider } from '@health-samurai/aidbox-client';
import type { AuthProvider } from '@health-samurai/aidbox-client';
import type { Config } from '../types/config.ts';
import type { Bundle } from '../types/fhir.ts';

/**
 * Thin wrapper over the official Aidbox TypeScript client
 * (@health-samurai/aidbox-client). Uses Basic auth with the `share-client`
 * registered in the init bundle.
 *
 * The client returns a `Result` (Ok | Err) rather than throwing on FHIR errors;
 * we surface that as a thrown Error for create/update and as `null` for a
 * missing read.
 */
export class FhirClient {
  private readonly client: AidboxClient;

  constructor(config: Config) {
    // The client prepends "/fhir" itself, so baseUrl must be the bare host.
    const baseUrl = config.aidbox.baseUrl;
    // BasicAuthProvider satisfies AuthProvider at runtime; the cast bridges a
    // typing quirk where AuthProvider.fetch demands the full global fetch type.
    const auth = new BasicAuthProvider(
      baseUrl,
      config.aidbox.clientId,
      config.aidbox.clientSecret
    ) as unknown as AuthProvider;
    this.client = new AidboxClient(baseUrl, auth);
  }

  /** Create a resource, letting Aidbox assign the id. */
  async create<T>(resourceType: string, resource: object): Promise<T> {
    const result = await this.client.create<T>({ type: resourceType, resource: resource as T });
    if (result.isErr()) {
      throw new Error(
        `Aidbox create ${resourceType} failed: ${JSON.stringify(result.value.resource)}`
      );
    }
    return result.value.resource;
  }

  /** Upsert a resource at a known id. */
  async put<T>(resourceType: string, id: string, resource: object): Promise<T> {
    const result = await this.client.update<T>({ type: resourceType, id, resource: resource as T });
    if (result.isErr()) {
      throw new Error(
        `Aidbox update ${resourceType}/${id} failed: ${JSON.stringify(result.value.resource)}`
      );
    }
    return result.value.resource;
  }

  /** Read a resource by id. Returns null if it does not exist. */
  async read<T>(resourceType: string, id: string): Promise<T | null> {
    const result = await this.client.read<T>({ type: resourceType, id });
    if (result.isErr()) {
      if (result.value.response.status === 404) return null;
      throw new Error(
        `Aidbox read ${resourceType}/${id} failed: ${JSON.stringify(result.value.resource)}`
      );
    }
    return result.value.resource;
  }

  /** Search a resource type, returning the matched resources (entries unwrapped). */
  async search<T>(resourceType: string, query: [string, string][]): Promise<T[]> {
    const result = await this.client.searchType({ type: resourceType, query });
    if (result.isErr()) {
      throw new Error(
        `Aidbox search ${resourceType} failed: ${JSON.stringify(result.value.resource)}`
      );
    }
    const bundle = result.value.resource as Bundle<T>;
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is T => r !== undefined && r !== null);
  }
}
