import {
  httpClient as http,
  HTTPError,
  type HttpClientInstance,
  type Input,
  type NormalizedOptions,
  type Options,
  type ResponsePromise,
} from './http-client';
import type {
  ResourceTypeMap,
  SearchParams,
  SubsSubscription,
  TaskDefinitionsMap,
  WorkflowDefinitionsMap,
} from './types';

export { HTTPError };

const isBrowser = () => typeof window !== 'undefined';

export function decode(str: string): string {
  if (!isBrowser()) {
    return Buffer.from(str, 'base64').toString();
  }
  return atob(str);
}

export function encode(str: string): string {
  if (!isBrowser()) {
    return Buffer.from(str).toString('base64');
  }
  return btoa(str);
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const buildResourceUrl = (resource: string, id?: string) =>
  ['fhir', resource, id && id].filter(Boolean).join('/');

type PartialResourceBody<T extends keyof ResourceTypeMap> = Partial<
  Omit<ResourceTypeMap[T], 'id' | 'meta'>
>;

type SetOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type UnnecessaryKeys =
  | 'contained'
  | 'extension'
  | 'modifierExtension'
  | '_id'
  | 'meta'
  | 'implicitRules'
  | '_implicitRules'
  | 'language'
  | '_language';

type Dir = 'asc' | 'desc';

export type PrefixWithArray = 'eq' | 'ne';

export type Prefix = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'sa' | 'eb' | 'ap';

export type ExecuteQueryResponseWrapper<T> = {
  data: T;
  query: string[];
  total: number;
};

export type CreateQueryParams = {
  isRequired: boolean;
  type: string;
  format?: string;
  default?: unknown;
};

export type CreateQueryBody = {
  params?: Record<string, CreateQueryParams>;
  query: string;
  'count-query': string;
};

// TODO: change to FHIR Bundle
export type BaseResponseResources<T extends keyof ResourceTypeMap> = {
  meta: { versionId: string };
  type: string;
  resourceType: string;
  total: number;
  link: { relation: string; url: string }[];
  entry?: { resource: ResourceTypeMap[T] }[];
  'query-timeout': number;
  'query-time': number;
  'query-sql': (string | number)[];
};

export type BaseResponseResource<T extends keyof ResourceTypeMap> = ResourceTypeMap[T];

export type ResourceKeys<T extends keyof ResourceTypeMap, I extends ResourceTypeMap[T]> = Omit<
  I,
  UnnecessaryKeys
>;

type SortKey<T extends keyof ResourceTypeMap> = keyof SearchParams[T] | `.${string}`;

type ElementsParams<T extends keyof ResourceTypeMap, R extends ResourceTypeMap[T]> = Array<
  keyof ResourceKeys<T, R>
>;

type ChangeFields<T, R> = Omit<T, keyof R> & R;
type SubscriptionParams = Omit<
  ChangeFields<SubsSubscription, { channel: Omit<SubsSubscription['channel'], 'type'> }>,
  'resourceType'
> & { id: string };

export type LogData = {
  message: Record<string, any>;
  type: string;
  v?: string;
  fx?: string;
};

interface JsonObject {
  [key: string]: JsonValue;
}
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
type JsonArray = JsonValue[];

export interface R<T> {
  // request: {},
  response: { headers: Headers; url: string; status: number; data: T };
}

export class E<T> extends Error {
  public response: R<T>['response'];
  public request: Request;
  public options: NormalizedOptions;

  constructor(data: T, response: Response, request: Request, options: NormalizedOptions) {
    const code = response.status || response.status === 0 ? response.status : '';
    const title = response.statusText || '';
    const status = `${code} ${title}`.trim();
    const reason = status ? `status code ${status}` : 'an unknown error';

    super(`Request failed with ${reason}`);

    this.name = 'HTTPError';
    this.response = {
      status: response.status,
      headers: response.headers,
      url: response.url,
      data,
    };
    this.request = request;
    this.options = options;
  }
}

const request =
  (fn: (url: Input, options?: Options) => ResponsePromise) =>
  async <T>(url: Input, options?: Options): Promise<R<T>> => {
    try {
      const response = await fn(url, options);
      return {
        response: {
          url: response.url,
          headers: response.headers,
          status: response.status,
          data: await response.json<T>(),
        },
      };
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        const data = await error.response.json();
        throw new E(data, error.response, error.request, error.options);
      }

      throw error;
    }
  };

// interface RequestWithData<T extends keyof ResourceTypeMap> {
//   method: 'POST' | 'PATCH' | 'PUT',
//   resourceType: T,
//   data: {},
//   search: {},
//   headers: {},
// }

// interface RequestWithoutData<T extends keyof ResourceTypeMap> {
//   method: 'GET' | 'DELETE'
//   resourceType: T,
//   search: {},
//   headers: {},
// }

class Task {
  private readonly workers: Array<object>;

  private client: HttpClientInstance;
  constructor(client: HttpClientInstance) {
    this.client = client;
    this.workers = [];
  }

  async cancel(id: string) {
    const response = await this.client
      .post('rpc', {
        json: {
          method: 'awf.task/cancel',
          params: { id },
        },
      })
      .json<TaskRpcResult>();

    return response.result.resource;
  }

  async start(id: string, executionId: string) {
    try {
      return this.client
        .post('rpc', {
          json: {
            method: 'awf.task/start',
            params: { id, execId: executionId },
          },
        })
        .json<TasksBatch>();
    } catch (error: any) {
      if (error.name === 'HTTPError') {
        const errorJson = await error.response.json();
      }
    }
  }

  async complete(id: string, executionId: string, payload: unknown) {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.task/success',
          params: { id, execId: executionId, result: payload },
        },
      })
      .json<TasksBatch>();
  }

  async fail(id: string, executionId: string, payload: unknown) {
    try {
      return this.client
        .post('rpc', {
          json: {
            method: 'awf.task/fail',
            params: { id, execId: executionId, result: payload },
          },
        })
        .json<TasksBatch>();
    } catch (error: any) {
      if (error.name === 'HTTPError') {
        const errorJson = await error.response.json();
      }
    }
  }

  private execute<K extends keyof TaskDefinitionsMap>(
    definition: K,
    params: TaskDefinitionsMap[K]['params'],
  ): Promise<TasksBatch> {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.task/create-and-execute',
          params: { definition, params },
        },
      })
      .json<TasksBatch>();
  }

  /**
   * Return number ready for execution tasks except Decisions task
   *
   * @param {string} [definition] - Task definition name
   * @returns {Promise<number>}
   *
   */

  async pendingTasks(definition?: keyof TaskDefinitionsMap): Promise<number> {
    const params = new URLSearchParams({
      _count: '0',
      '.status': 'ready',
      'definition-not': 'awf.workflow/decision-task',
    });
    if (definition) {
      params.append('definition', definition);
      params.delete('definition-not');
    }
    return this.client
      .get('AidboxTask', {
        searchParams: params,
      })
      .json<{ total: number }>()
      .then((r) => r.total);
  }

  async pendingDecisions() {
    return this.client
      .get('AidboxTask', {
        searchParams: new URLSearchParams({
          _count: '0',
          '.status': 'ready',
          definition: 'awf.workflow/decision-task',
        }),
      })
      .json<{ total: number }>()
      .then((r) => r.total);
  }

  async history(id: string) {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.task/status',
          params: { id, 'include-log?': true },
        },
      })
      .json<{
        result: { resource: TaskMeta<TaskInput>; log: Record<string, any>[] };
      }>()
      .then((r) => r.result);
  }

  async inProgress() {
    return this.client
      .get('AidboxTask', {
        searchParams: new URLSearchParams({
          _count: '0',
          '.status': 'in-progress',
        }),
      })
      .json<{ total: number }>()
      .then((r) => r.total);
  }

  createHandler<T extends TaskInput | DecisionInput>(handler: (task: TaskMeta<T>) => void) {
    return async (task: TaskMeta<T>) => {
      await this.start(task.id, task.execId);

      try {
        const result = await handler(task);
        await this.complete(task.id, task.execId, result);
      } catch (error: any) {
        if (error.name === 'HTTPError') {
          const errorJson = await error.response.json();
          await this.fail(task.id, task.execId, errorJson);
        } else {
          // for some reason does not fail the task
          await this.fail(task.id, task.execId, error);
        }
      }
    };
  }

  async poll(
    params: { workflowDefinitions?: [string]; taskDefinitions?: [string] },
    options: WorkerOptions,
  ) {
    const tasksBatch = await this.client
      .post('rpc', {
        json: {
          method: 'awf.task/poll',
          params: { ...params, maxBatchSize: options.batchSize },
        },
      })
      .json<TasksBatch>();

    return tasksBatch.result.resources;
  }

  private async runDaemon(
    poll: () => Promise<Array<TaskMeta<TaskInput | DecisionInput>>>,
    handler: (input: any) => any,
    options: WorkerOptions,
  ) {
    while (true) {
      const tasks = await poll();
      await Promise.allSettled(tasks.map(async (task) => handler(task)));
      await sleep(options.pollInterval || 1000);
    }
  }

  implement<K extends keyof Omit<TaskDefinitionsMap, 'awf.task/wait'>>(
    name: K,
    handler: TaskHandler<K>,
    options: WorkerOptions = {},
  ): void {
    const worker = this.runDaemon(
      () => this.poll({ taskDefinitions: [name] }, options),
      this.createHandler<TaskInput>(handler),
      options,
    );
    this.workers.push(worker);
  }
}

class Workflow {
  private readonly workers: Array<object>;

  private client: HttpClientInstance;
  private task: Task;
  constructor(client: HttpClientInstance, task: Task) {
    this.client = client;
    this.task = task;
    this.workers = [];
  }

  private async runDaemon(
    poll: () => Promise<Array<TaskMeta<TaskInput | DecisionInput>>>,
    handler: (input: any) => any,
    options: WorkerOptions,
  ) {
    while (true) {
      const tasks = await poll();
      await Promise.allSettled(tasks.map(async (task) => handler(task)));
      await sleep(options.pollInterval || 1000);
    }
  }

  implement<W extends keyof WorkflowDefinitionsMap>(
    name: W,
    handler: WorkflowHandler<W>,
    options: WorkerOptions = {},
  ): void {
    const worker = this.runDaemon(
      () => this.task.poll({ workflowDefinitions: [name] }, options),
      this.task.createHandler<DecisionInput>(this.wrapHandler<W>(handler)),
      options,
    );
    this.workers.push(worker);
  }

  private wrapHandler<W extends keyof WorkflowDefinitionsMap>(handler: WorkflowHandler<W>) {
    return (params: TaskMeta<DecisionInput>) =>
      handler(params, {
        complete: (result: WorkflowDefinitionsMap[W]['result']) => ({
          action: 'awf.workflow.action/complete-workflow',
          result,
        }),
        execute: <T extends keyof TaskDefinitionsMap>(params: {
          definition: T;
          params: TaskDefinitionsMap[T]['params'];
        }) => ({
          action: 'awf.workflow.action/schedule-task',
          'task-request': {
            definition: params.definition,
            params: params.params,
          },
        }),
        fail: (error: any) => ({ action: 'awf.workflow.action/fail', error }),
      });
  }

  execute<K extends keyof WorkflowDefinitionsMap>(
    definition: K,
    params: WorkflowDefinitionsMap[K]['params'],
  ): Promise<TasksBatch> {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.workflow/create-and-execute',
          params: { definition, params },
        },
      })
      .json<TasksBatch>();
  }

  async terminate(id: string) {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.workflow/cancel',
          params: { id },
        },
      })
      .json<WorkflowTerminateRpc>()
      .then((r) => r.result.resource);
  }

  async inProgress() {
    return this.client
      .get('AidboxWorkflow', {
        searchParams: new URLSearchParams({
          _count: '0',
          '.status': 'in-progress',
        }),
      })
      .json<{ total: number }>()
      .then((r) => r.total);
  }

  async history(id: string) {
    return this.client
      .post('rpc', {
        json: {
          method: 'awf.workflow/status',
          params: { id, 'include-activities?': true },
        },
      })
      .json<WorkflowHistoryRpc>()
      .then((r) => r.result);
  }
}

export interface TokenStorage {
  get: () => Promise<string | null> | string | null;
  set: (token: string | undefined) => Promise<void> | void;
}

const resourceOwnerAuthorization =
  (httpclient: HttpClientInstance, auth: ResourceOwnerAuthorization) =>
  async ({ username, password }: { username: string; password: string }) => {
    if (typeof auth.storage.set === 'function') {
      await auth.storage.set('');
    }

    const response = await httpclient
      .post('auth/token', {
        json: {
          username,
          password,
          client_id: auth.client.id,
          client_secret: auth.client.secret,
          grant_type: 'password',
        },
      })
      .json<{
        access_token: string;
        token_type: 'Bearer';
        userinfo: { email: string; id: string };
      }>();

    if (typeof auth.storage.set === 'function') {
      await auth.storage.set(response.access_token);
    }

    return response;
  };

const resourceOwnerLogout =
  (httpclient: HttpClientInstance, auth: ResourceOwnerAuthorization) => async () => {
    auth.storage.set(undefined);
  };

export type ProcessableBundle = Omit<ResourceTypeMap['Bundle'], 'type'> & {
  type: 'batch' | 'transaction';
};

export type BasicAuthorization = {
  method: 'basic';
  credentials: { username: string; password: string };
};
export type ResourceOwnerAuthorization = {
  method: 'resource-owner';
  client: { id: string; secret: string };
  storage: TokenStorage;
};

function isBasic(
  params: BasicAuthorization | ResourceOwnerAuthorization,
): params is BasicAuthorization {
  return params.method === 'basic';
}

function isResourceOwner(
  params: BasicAuthorization | ResourceOwnerAuthorization,
): params is ResourceOwnerAuthorization {
  return params.method === 'resource-owner';
}

export class Client<T extends BasicAuthorization | ResourceOwnerAuthorization> {
  private client: HttpClientInstance;
  private config: { auth: T };
  task: Task;
  workflow: Workflow;
  constructor(baseURL: string, config: { auth: T }) {
    this.config = config;
    const client = http.create({
      prefixUrl: baseURL,
      throwHttpErrors: true,
      hooks: {
        beforeRequest: [
          async (request: Request) => {
            if (isBasic(config.auth)) {
              const { username, password } = config.auth.credentials;
              request.headers.set('Authorization', `Basic ${encode(`${username}:${password}`)}`);
            }

            if (isResourceOwner(config.auth)) {
              const token = config.auth.storage.get();
              if (token) request.headers.set('Authorization', `Bearer ${token}`);
            }
            
            return request;
          },
        ],
      },
    });
    const taskClient = new Task(client);
    this.task = taskClient;
    this.workflow = new Workflow(client, taskClient);
    this.client = client;
  }

  public get auth() {
    if (isBasic(this.config.auth)) return this.config.auth;

    if (isResourceOwner(this.config.auth)) {
      return {
        ...this.config.auth,
        signIn: resourceOwnerAuthorization(this.client, this.config.auth),
        signUp: () => {},
        signOut: () => {},
      };
    }

    throw new Error('');
  }

  // переделать на reduce и добавить полей
  HTTPClient = () => ({
    get: request(this.client.get),
    post: request(this.client.post),
    patch: request(this.client.patch),
    put: request(this.client.put),
    delete: request(this.client.delete),
    head: request(this.client.head),
  });

  private search = <T extends keyof ResourceTypeMap>(resourceName: T) => {
    return new GetResources((searchParams: URLSearchParams) => {
      return this.client.get(buildResourceUrl(resourceName), { searchParams });
    }, resourceName);
  };

  resource = {
    processBundle: (data: ResourceTypeMap['Bundle']): Promise<ResourceTypeMap['Bundle']> => {
      return this.client
        .post(buildResourceUrl(''), { json: data })
        .json<ResourceTypeMap['Bundle']>();
    },
    conditionalUpdate: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      input: PartialResourceBody<T>,
    ) => {
      return new FindBeforeAction((searchParams: URLSearchParams) => {
        return this.client.patch(buildResourceUrl(resourceName), { json: input, searchParams });
      }, resourceName);
    },
    conditionalCreate: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      input: PartialResourceBody<T>,
    ) => {
      return new FindBeforeAction((searchParams: URLSearchParams) => {
        return this.client.post(buildResourceUrl(resourceName), { json: input, searchParams });
      }, resourceName);
    },
    conditionalOverride: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      input: PartialResourceBody<T>,
    ) => {
      return new FindBeforeAction((searchParams: URLSearchParams) => {
        return this.client.put(buildResourceUrl(resourceName), { json: input, searchParams });
      }, resourceName);
    },
    // TODO: no body in response if resource doesn't exist -> lead to parsing error
    conditionalDelete: <T extends keyof ResourceTypeMap>(resourceName: T) => {
      return new FindBeforeAction((searchParams: URLSearchParams) => {
        return this.client.delete(buildResourceUrl(resourceName), { searchParams });
      }, resourceName);
    },
    search: this.search,
    list: this.search,
    get: async <T extends keyof ResourceTypeMap>(
      resourceName: T,
      id: string,
    ): Promise<ResourceTypeMap[T]> => {
      return this.client.get(buildResourceUrl(resourceName, id)).json<ResourceTypeMap[T]>();
    },
    delete: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      id: string,
    ): Promise<ResourceTypeMap[T]> => {
      return this.client.delete(buildResourceUrl(resourceName, id)).json<ResourceTypeMap[T]>();
    },
    update: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      id: string,
      input: PartialResourceBody<T>,
    ): Promise<ResourceTypeMap[T]> => {
      return this.client
        .patch(buildResourceUrl(resourceName, id), { json: input })
        .json<ResourceTypeMap[T]>();
    },
    create: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      input: SetOptional<ResourceTypeMap[T] & { resourceType: string }, 'resourceType'>,
    ) => {
      return this.client
        .post(buildResourceUrl(resourceName), { json: input })
        .json<ResourceTypeMap[T]>();
    },
    override: <T extends keyof ResourceTypeMap>(
      resourceName: T,
      id: string,
      input: PartialResourceBody<T>,
    ): Promise<ResourceTypeMap[T]> => {
      return this.client
        .put(buildResourceUrl(resourceName, id), { json: input })
        .json<ResourceTypeMap[T]>();
    },
  };

  async rpc<T = any>(method: string, params: unknown): Promise<T> {
    const response = await this.client.post('rpc', {
      method: 'POST',
      json: { method, params },
    });

    return response.json<T>();
  }

  aidboxQuery = {
    create: async (name: string, json: CreateQueryBody) => {
      const response = await this.client.put(`AidboxQuery/${name}`, { json });
      return response.json();
    },
    execute: async <T>(name: string, params?: Record<string, unknown>) => {
      const queryParams = new URLSearchParams();
      if (params) {
        for (const key of Object.keys(params)) {
          const value = params[key];
          if (value) {
            queryParams.set(key, (value as any).toString());
          }
        }
      }
      return this.client
        .get(`/$query/${name}`, {
          searchParams: queryParams,
        })
        .json<ExecuteQueryResponseWrapper<T>>();
    },
  };

  subsSubscription = {
    create: async ({
      id,
      status,
      trigger,
      channel,
    }: SubscriptionParams): Promise<SubsSubscription> => {
      const response = await this.client.put(`SubsSubscription/${id}`, {
        json: {
          status,
          trigger,
          channel: { ...channel, type: 'rest-hook' },
        },
      });
      return response.json<SubsSubscription>();
    },
  };

  async rawSQL<T>(sql: string, params?: string[]): Promise<T> {
    const body = [sql, ...(params?.map((value: unknown) => value?.toString()) ?? [])];

    const response = await this.client.post('$sql', { json: body });
    return response.json<T>();
  }

  async sendLog(data: LogData): Promise<void> {
    await this.client.post('$loggy', { json: data });
  }
}

export class GetResources<T extends keyof ResourceTypeMap>
  implements PromiseLike<BaseResponseResources<T>>
{
  protected searchParamsObject: URLSearchParams;
  resourceName: T;
  fun: (params: URLSearchParams) => ResponsePromise;

  constructor(fun: (params: URLSearchParams) => ResponsePromise, resourceName: T) {
    this.searchParamsObject = new URLSearchParams();
    this.resourceName = resourceName;
    this.fun = fun;
  }

  where<K extends keyof SearchParams[T], SP extends SearchParams[T][K], PR extends PrefixWithArray>(
    key: K | string,
    value: SP | SP[],
    prefix?: PR,
  ): this;

  where<
    K extends keyof SearchParams[T],
    SP extends SearchParams[T][K],
    PR extends Exclude<Prefix, PrefixWithArray>,
  >(key: K | string, value: SP, prefix?: PR): this;

  where<K extends keyof SearchParams[T], SP extends SearchParams[T][K]>(
    key: K | string,
    value: SP | SP[],
    prefix?: Prefix | never,
  ): this {
    if (!Array.isArray(value)) {
      this.searchParamsObject.append(key.toString(), `${prefix || ''}${value}`);
      return this;
    }

    if (prefix && prefix === 'eq') {
      this.searchParamsObject.append(key.toString(), value.join(','));
      return this;
    }

    if (prefix) {
      value.forEach((item) => this.searchParamsObject.append(key.toString(), `${prefix}${item}`));
      return this;
    }

    this.searchParamsObject.append(key.toString(), value.join(','));
    return this;
  }

  async then<TResult1 = BaseResponseResources<T>, TResult2 = never>(
    onfulfilled?: (value: BaseResponseResources<T>) => PromiseLike<TResult1> | TResult1,
    onrejected?: (reason: unknown) => PromiseLike<TResult2> | TResult2,
  ): Promise<TResult1 | TResult2> {
    return this.fun(this.searchParamsObject).then((response) => {
      return onfulfilled
        ? response.json<BaseResponseResources<T>>().then((data) => onfulfilled(data))
        : response.json();
    }, onrejected);
  }

  async catch(onRejected: (reason: unknown) => Promise<unknown>) {
    return this.then(undefined, onRejected);
  }

  contained(contained: boolean | 'both', containedType?: 'container' | 'contained') {
    this.searchParamsObject.set('_contained', contained.toString());

    if (containedType) {
      this.searchParamsObject.set('_containedType', containedType);
    }

    return this;
  }

  count(value: number) {
    this.searchParamsObject.set('_count', value.toString());

    return this;
  }

  page(value: number) {
    this.searchParamsObject.set('_page', value.toString());

    return this;
  }

  elements(args: ElementsParams<T, ResourceTypeMap[T]>) {
    const queryValue = args.join(',');

    this.searchParamsObject.set('_elements', queryValue);

    return this;
  }

  summary(type: boolean | 'text' | 'data' | 'count') {
    this.searchParamsObject.set('_summary', type.toString());

    return this;
  }

  sort(key: SortKey<T>, dir: Dir) {
    const existedSortParams = this.searchParamsObject.get('_sort');

    if (existedSortParams) {
      const newSortParams = `${existedSortParams},${dir === 'asc' ? '-' : ''}${key.toString()}`;

      this.searchParamsObject.set('_sort', newSortParams);
      return this;
    }

    this.searchParamsObject.set('_sort', dir === 'asc' ? `-${key.toString()}` : key.toString());

    return this;
  }
}

export class FindBeforeAction<T extends keyof ResourceTypeMap>
  implements PromiseLike<BaseResponseResource<T>>
{
  protected searchParamsObject: URLSearchParams;
  resourceName: T;
  fun: (params: URLSearchParams) => ResponsePromise;

  constructor(fun: (params: URLSearchParams) => ResponsePromise, resourceName: T) {
    this.searchParamsObject = new URLSearchParams();
    this.resourceName = resourceName;
    this.fun = fun;
  }

  where<K extends keyof SearchParams[T], SP extends SearchParams[T][K], PR extends PrefixWithArray>(
    key: K | string,
    value: SP | SP[],
    prefix?: PR,
  ): this;

  where<
    K extends keyof SearchParams[T],
    SP extends SearchParams[T][K],
    PR extends Exclude<Prefix, PrefixWithArray>,
  >(key: K | string, value: SP, prefix?: PR): this;

  where<K extends keyof SearchParams[T], SP extends SearchParams[T][K]>(
    key: K | string,
    value: SP | SP[],
    prefix?: Prefix | never,
  ): this {
    if (!Array.isArray(value)) {
      this.searchParamsObject.append(key.toString(), `${prefix || ''}${value}`);
      return this;
    }

    if (prefix && prefix === 'eq') {
      this.searchParamsObject.append(key.toString(), value.join(','));
      return this;
    }

    if (prefix) {
      value.forEach((item) => this.searchParamsObject.append(key.toString(), `${prefix}${item}`));
      return this;
    }

    this.searchParamsObject.append(key.toString(), value.join(','));
    return this;
  }

  async then<TResult1 = BaseResponseResource<T>, TResult2 = never>(
    onfulfilled?: (value: BaseResponseResource<T>) => PromiseLike<TResult1> | TResult1,
    onrejected?: (reason: unknown) => PromiseLike<TResult2> | TResult2,
  ): Promise<TResult1 | TResult2> {
    return this.fun(this.searchParamsObject).then((response) => {
      return onfulfilled
        ? response.json<BaseResponseResource<T>>().then((data) => onfulfilled(data))
        : response.json();
    }, onrejected);
  }

  async catch(onRejected: (reason: unknown) => Promise<unknown>) {
    return this.then(undefined, onRejected);
  }
}

type EventType = 'awf.workflow.event/workflow-init' | 'awf.workflow.event/task-completed';
type TaskStatus = 'requested' | 'in-progress';
type RequesterType = 'AidboxWorkflow';

interface TaskMeta<T> {
  id: string;
  execId: string;
  definition: string;
  params: T;
  'workflow-definition': string;
  resourceType: 'AidboxTask';
  status: TaskStatus;
  requester: { id: string; resourceType: RequesterType };
  meta: { lastUpdated: string; createdAt: string; versionId: string };
}

type WorkerOptions = {
  pollInterval?: number;
  batchSize?: number;
};

type TaskInput = TaskDefinitionsMap[keyof TaskDefinitionsMap]['params'];
type DecisionInput = { event: EventType };

interface TasksBatch {
  result: { resources: Array<TaskMeta<TaskInput | DecisionInput>> };
}

interface TaskRpcResult {
  result: { resource: TaskMeta<TaskInput> };
}

interface AidboxWorkflow {
  requester: { id: string; resourceType: string };
  retryCount: number;
  execId: string;
  status: 'created' | 'in-progress' | 'done';
  outcome?: 'succeeded' | 'failed' | 'canceled';
  outcomeReason?: {
    type:
      | 'awf.task/failed-due-to-in-progress-timeout'
      | 'awf.workflow/failed-by-executor'
      | 'awf.executor/unknown-error';
    message: string;
    data?: any;
  };
  result: any;
  error: any;
}

interface WorkflowTerminateRpc {
  result: {
    resource: AidboxWorkflow;
  };
}

interface WorkflowHistoryRpc {
  result: {
    resource: AidboxWorkflow;
    activities: TaskMeta<TaskInput>;
  };
}

interface WorkflowActions<K extends keyof WorkflowDefinitionsMap> {
  complete: (params: WorkflowDefinitionsMap[K]['result']) => {
    action: 'awf.workflow.action/complete-workflow';
    result: WorkflowDefinitionsMap[K]['result'];
  };
  execute: <T extends keyof TaskDefinitionsMap>(params: {
    definition: T;
    params: TaskDefinitionsMap[T]['params'];
  }) => {
    action: 'awf.workflow.action/schedule-task';
    'task-request': { definition: T; params: TaskDefinitionsMap[T]['params'] };
  };
  fail: (params: unknown) => {
    action: 'awf.workflow.action/fail';
    error: unknown;
  };
}

type TaskHandler<K extends keyof Omit<TaskDefinitionsMap, 'awf.task/wait'>> = (
  params: TaskMeta<TaskDefinitionsMap[K]['params']>,
) => Promise<TaskDefinitionsMap[K]['result']> | TaskDefinitionsMap[K]['result'];

type WorkflowHandler<K extends keyof WorkflowDefinitionsMap> = (
  params: TaskMeta<DecisionInput>,
  actions: WorkflowActions<K>,
) => void;

type BundleRequestEntry<T = ResourceTypeMap[keyof ResourceTypeMap]> = {
  request: { method: string; url: string };
  resource?: T;
};

export type HTTPMethod = 'POST' | 'PATCH' | 'PUT' | 'GET';

export class Bundle {
  entry: BundleRequestEntry[];
  type: 'batch' | 'transaction';

  constructor(type: 'batch' | 'transaction' = 'transaction') {
    this.type = type;
    this.entry = [];
  }

  addEntry<T extends keyof ResourceTypeMap>(
    resource: ResourceTypeMap[T],
    { method, resourceName, id }: { method: HTTPMethod; resourceName: T; id?: string },
  ) {
    this.entry.push({
      request: {
        method,
        url: buildResourceUrl(resourceName, id),
      },
      resource: { ...resource, resourceType: resourceName },
    });
  }

  toJSON(): ResourceTypeMap['Bundle'] {
    return {
      resourceType: 'Bundle',
      type: this.type,
      entry: this.entry,
    } as any;
  }

  toString() {
    return JSON.stringify({
      resourceType: 'Bundle',
      type: this.type,
      entry: this.entry,
    });
  }
}
