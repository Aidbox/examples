// import type { Equal, Expect } from '@type-challenges/utils';

export type RetryOptions = {
  /**
    The number of times to retry failed requests.

    @default 2
    */
  limit?: number;

  /**
    The HTTP methods allowed to retry.

    @default ['get', 'put', 'head', 'delete', 'options', 'trace']
    */
  methods?: string[];

  /**
    The HTTP status codes allowed to retry.

    @default [408, 413, 429, 500, 502, 503, 504]
    */
  statusCodes?: number[];

  /**
    The HTTP status codes allowed to retry with a `Retry-After` header.

    @default [413, 429, 503]
    */
  afterStatusCodes?: number[];

  /**
    If the `Retry-After` header is greater than `maxRetryAfter`, the request will be canceled.

    @default Infinity
    */
  maxRetryAfter?: number;

  /**
    The upper limit of the delay per retry in milliseconds.
    To clamp the delay, set `backoffLimit` to 1000, for example.

    By default, the delay is calculated in the following way:

    ```
    0.3 * (2 ** (attemptCount - 1)) * 1000
    ```

    The delay increases exponentially.

    @default Infinity
    */
  backoffLimit?: number;
};

const isDomExceptionSupported = Boolean(globalThis.DOMException);

// TODO: When targeting Node.js 18, use `signal.throwIfAborted()` (https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted)
export function composeAbortError(signal?: AbortSignal) {
  /*
    NOTE: Use DomException with AbortError name as specified in MDN docs (https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)
    > When abort() is called, the fetch() promise rejects with an Error of type DOMException, with name AbortError.
    */
  if (isDomExceptionSupported) {
    return new DOMException(signal?.reason ?? 'The operation was aborted.', 'AbortError');
  }

  // DOMException not supported. Fall back to use of error and override name.
  const error = new Error(signal?.reason ?? 'The operation was aborted.');
  error.name = 'AbortError';

  return error;
}

export class HTTPError extends Error {
  public response: Response;
  public request: Request;
  public options: NormalizedOptions;

  constructor(response: Response, request: Request, options: NormalizedOptions) {
    const code = response.status || response.status === 0 ? response.status : '';
    const title = response.statusText || '';
    const status = `${code} ${title}`.trim();
    const reason = status ? `status code ${status}` : 'an unknown error';

    super(`Request failed with ${reason}`);

    this.name = 'HTTPError';
    this.response = response;
    this.request = request;
    this.options = options;
  }
}

export class TimeoutError extends Error {
  public request: Request;

  constructor(request: Request) {
    super('Request timed out');
    this.name = 'TimeoutError';
    this.request = request;
  }
}

export type DelayOptions = {
  signal?: InternalOptions['signal'];
};

export async function delay(ms: number, { signal }: DelayOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal) {
      if (signal.aborted) {
        reject(composeAbortError(signal));
        return;
      }

      signal.addEventListener('abort', handleAbort, { once: true });
    }

    function handleAbort() {
      reject(composeAbortError(signal!));
      clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
  });
}
export const isObject = (value: unknown): value is object =>
  value !== null && typeof value === 'object';

export const validateAndMerge = (
  ...sources: Array<Partial<Options> | undefined>
): Partial<Options> => {
  for (const source of sources) {
    if ((!isObject(source) || Array.isArray(source)) && source !== undefined) {
      throw new TypeError('The `options` argument must be an object');
    }
  }

  return deepMerge({}, ...sources);
};

export const mergeHeaders = (
  source1: HttpClientHeadersInit = {},
  source2: HttpClientHeadersInit = {},
) => {
  const result = new globalThis.Headers(source1 as HeadersInit);
  const isHeadersInstance = source2 instanceof globalThis.Headers;
  const source = new globalThis.Headers(source2 as HeadersInit);
  for (const [key, value] of source.entries()) {
    if ((isHeadersInstance && value === 'undefined') || value === undefined) {
      result.delete(key);
    } else {
      result.set(key, value);
    }
  }

  return result;
};

export const deepMerge = <T>(...sources: Array<Partial<T> | undefined>): T => {
  let returnValue: any = {};
  let headers = {};

  for (const source of sources) {
    if (Array.isArray(source)) {
      if (!Array.isArray(returnValue)) {
        returnValue = [];
      }

      returnValue = [...returnValue, ...source];
    } else if (isObject(source)) {
      for (const [key, value] of Object.entries(source)) {
        let newValue = value;
        if (isObject(value) && key in returnValue) {
          newValue = deepMerge(returnValue[key], value);
        }

        returnValue = { ...returnValue, [key]: newValue };
      }

      if (isObject((source as any).headers)) {
        headers = mergeHeaders(headers, (source as any).headers);
        returnValue.headers = headers;
      }
    }
  }

  return returnValue;
};

export const normalizeRequestMethod = (input: string): string =>
  requestMethods.includes(input as HttpMethod) ? input.toUpperCase() : input;

const retryMethods = ['get', 'put', 'head', 'delete', 'options', 'trace'];

const retryStatusCodes = [408, 413, 429, 500, 502, 503, 504];

const retryAfterStatusCodes = [413, 429, 503];

const defaultRetryOptions: Required<RetryOptions> = {
  limit: 2,
  methods: retryMethods,
  statusCodes: retryStatusCodes,
  afterStatusCodes: retryAfterStatusCodes,
  maxRetryAfter: Number.POSITIVE_INFINITY,
  backoffLimit: Number.POSITIVE_INFINITY,
};

export const normalizeRetryOptions = (
  retry: number | RetryOptions = {},
): Required<RetryOptions> => {
  if (typeof retry === 'number') {
    return {
      ...defaultRetryOptions,
      limit: retry,
    };
  }

  if (retry.methods && !Array.isArray(retry.methods)) {
    throw new Error('retry.methods must be an array');
  }

  if (retry.statusCodes && !Array.isArray(retry.statusCodes)) {
    throw new Error('retry.statusCodes must be an array');
  }

  return {
    ...defaultRetryOptions,
    ...retry,
    afterStatusCodes: retryAfterStatusCodes,
  };
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type ObjectEntries<T> = T extends ArrayLike<infer U>
  ? Array<[string, U]>
  : Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;

export type TimeoutOptions = {
  timeout: number;
  fetch: typeof fetch;
};

export async function timeout(
  request: Request,
  abortController: AbortController | undefined,
  options: TimeoutOptions,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }

      reject(new TimeoutError(request));
    }, options.timeout);

    options
      .fetch(request)
      .then(resolve)
      .catch(reject)
      .then(() => {
        clearTimeout(timeoutId);
      });
  });
}

export type ResponsePromise = {
  arrayBuffer: () => Promise<ArrayBuffer>;

  blob: () => Promise<Blob>;

  formData: () => Promise<FormData>;

  /**
    Get the response body as JSON.
    */
  json: <T = unknown>() => Promise<T>;

  text: () => Promise<string>;
} & Promise<HttpClientResponse>;

export type Primitive = null | undefined | string | number | boolean | symbol | bigint;

export type Required<T, K extends keyof T = keyof T> = T & { [P in K]-?: T[P] };

export type LiteralUnion<LiteralType extends BaseType, BaseType extends Primitive> =
  | LiteralType
  | (BaseType & { _?: never });

export type HttpClientResponse = {
  json: <T = unknown>() => Promise<T>;
} & Response;

export const supportsRequestStreams = (() => {
  let duplexAccessed = false;
  let hasContentType = false;
  const supportsReadableStream = typeof globalThis.ReadableStream === 'function';
  const supportsRequest = typeof globalThis.Request === 'function';

  if (supportsReadableStream && supportsRequest) {
    hasContentType = new globalThis.Request('https://empty.invalid', {
      body: new globalThis.ReadableStream(),
      method: 'POST',
      // @ts-expect-error - Types are outdated.
      get duplex() {
        duplexAccessed = true;
        return 'half';
      },
    }).headers.has('Content-Type');
  }

  return duplexAccessed && !hasContentType;
})();

export const supportsAbortController = typeof globalThis.AbortController === 'function';
export const supportsResponseStreams = typeof globalThis.ReadableStream === 'function';
export const supportsFormData = typeof globalThis.FormData === 'function';

export const requestMethods = ['get', 'post', 'put', 'patch', 'head', 'delete'] as const;

// const validate = <T extends Array<true>>() => undefined as unknown as T;
// validate<[Expect<Equal<(typeof requestMethods)[number], HttpMethod>>]>();

export const responseTypes = {
  json: 'application/json',
  text: 'text/*',
  formData: 'multipart/form-data',
  arrayBuffer: '*/*',
  blob: '*/*',
} as const;

// The maximum value of a 32bit int (see issue #117)
export const maxSafeTimeout = 2_147_483_647;

export const stop = Symbol('stop');

export type HttpClientInstance = {
  /**
    Fetch the given `url`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` method added.

    */
  (url: Input, options?: Options): ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'get'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  get: (url: Input, options?: Options) => ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'post'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  post: (url: Input, options?: Options) => ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'put'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  put: (url: Input, options?: Options) => ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'delete'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  delete: (url: Input, options?: Options) => ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'patch'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  patch: (url: Input, options?: Options) => ResponsePromise;

  /**
    Fetch the given `url` using the option `{method: 'head'}`.

    @param url - `Request` object, `URL` object, or URL string.
    @returns A promise with `Body` methods added.
    */
  head: (url: Input, options?: Options) => ResponsePromise;

  /**
    Create a new  instance with complete new defaults.

    @returns A new client instance.
    */
  create: (defaultOptions: Options) => HttpClientInstance;

  /**
    Create a new client instance with some defaults overridden with your own.

    In contrast to `client.create()`, `client.extend()` inherits defaults from its parent.

    @returns A new client instance.
    */
  extend: (defaultOptions: Options) => HttpClientInstance;

  /**
    A `Symbol` that can be returned by a `beforeRetry` hook to stop the retry. This will also short circuit the remaining `beforeRetry` hooks.

    Note: Returning this symbol makes client abort and return with an `undefined` response. Be sure to check for a response before accessing any properties on it or use [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining). It is also incompatible with body methods, such as `.json()` or `.text()`, because there is no response to parse. In general, we recommend throwing an error instead of returning this symbol, as that will cause client to abort and then throw, which avoids these limitations.

    A valid use-case for `client.stop` is to prevent retries when making requests for side effects, where the returned data is not important. For example, logging client activity to the server.

    */
  readonly stop: typeof stop;
};

export type BeforeRequestHook = (
  request: Request,
  options: NormalizedOptions,
) => Request | Response | undefined | Promise<Request | Response | undefined>;

export type BeforeRetryState = {
  request: Request;
  options: NormalizedOptions;
  error: Error;
  retryCount: number;
};
export type BeforeRetryHook = (
  options: BeforeRetryState,
) => typeof stop | undefined | Promise<typeof stop | undefined>;

export type AfterResponseHook = (
  request: Request,
  options: NormalizedOptions,
  response: Response,
) => Response | undefined | Promise<Response | undefined>;

export type BeforeErrorHook = (error: HTTPError) => HTTPError | Promise<HTTPError>;

export type Hooks = {
  /**
    This hook enables you to modify the request right before it is sent. client will make no further changes to the request after this. The hook function receives normalized input and options as arguments. You could, forf example, modiy `options.headers` here.

    A [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) can be returned from this hook to completely avoid making a HTTP request. This can be used to mock a request, check an internal cache, etc. An **important** consideration when returning a `Response` from this hook is that all the following hooks will be skipped, so **ensure you only return a `Response` from the last hook**.

    @default []
    */
  beforeRequest?: BeforeRequestHook[];

  /**
    This hook enables you to modify the request right before retry. client will make no further changes to the request after this. The hook function receives an object with the normalized request and options, an error instance, and the retry count. You could, for example, modify `request.headers` here.

    If the request received a response, the error will be of type `HTTPError` and the `Response` object will be available at `error.response`. Be aware that some types of errors, such as network errors, inherently mean that a response was not received. In that case, the error will not be an instance of `HTTPError`.

    You can prevent client from retrying the request by throwing an error. client will not handle it in any way and the error will be propagated to the request initiator. The rest of the `beforeRetry` hooks will not be called in this case. Alternatively, you can return the [`client.stop`](#client.stop) symbol to do the same thing but without propagating an error (this has some limitations, see `client.stop` docs for details).

    @default []
    */
  beforeRetry?: BeforeRetryHook[];

  /**
    This hook enables you to read and optionally modify the response. The hook function receives normalized input, options, and a clone of the response as arguments. The return value of the hook function will be used by client as the response object if it's an instance of [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response).

    @default []

    */
  afterResponse?: AfterResponseHook[];

  /**
    This hook enables you to modify the `HTTPError` right before it is thrown. The hook function receives a `HTTPError` as an argument and should return an instance of `HTTPError`.

    @default []

    @example
    ```
    import client from 'client';

    await client('https://example.com', {
        hooks: {
            beforeError: [
                error => {
                    const {response} = error;
                    if (response && response.body) {
                        error.name = 'GitHubError';
                        error.message = `${response.body.message} (${response.status})`;
                    }

                    return error;
                }
            ]
        }
    });
    ```
    */
  beforeError?: BeforeErrorHook[];
};

export type SearchParamsInit =
  | string
  | string[][]
  | Record<string, string>
  | URLSearchParams
  | undefined;

export type SearchParamsOption =
  | SearchParamsInit
  | Record<string, string | number | boolean>
  | Array<Array<string | number | boolean>>;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete';

export type Input = string | URL | Request;

export type DownloadProgress = {
  percent: number;
  transferredBytes: number;

  /**
    Note: If it's not possible to retrieve the body size, it will be `0`.
    */
  totalBytes: number;
};

export type HttpClientHeadersInit = HeadersInit | Record<string, string | undefined>;

/**
Options are the same as `window.fetch`, with some exceptions.
*/
export type Options = {
  /**
    HTTP method used to make the request.

    Internally, the standard methods (`GET`, `POST`, `PUT`, `PATCH`, `HEAD` and `DELETE`) are uppercased in order to avoid server errors due to case sensitivity.
    */
  method?: LiteralUnion<HttpMethod, string>;

  /**
    HTTP headers used to make the request.

    You can pass a `Headers` instance or a plain object.

    You can remove a header with `.extend()` by passing the header with an `undefined` value.

    ```
    */
  headers?: HttpClientHeadersInit;

  /**
    Shortcut for sending JSON. Use this instead of the `body` option.

    Accepts any plain object or value, which will be `JSON.stringify()`'d and sent in the body with the correct header set.
    */
  json?: unknown;

  /**
    User-defined JSON-parsing function.

    Use-cases:
    1. Parse JSON via the [`bourne` package](https://github.com/hapijs/bourne) to protect from prototype pollution.
    2. Parse JSON with [`reviver` option of `JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse).

    @default JSON.parse()

    ```
    */
  parseJson?: (text: string) => unknown;

  /**
    Search parameters to include in the request URL. Setting this will override all existing search parameters in the input URL.

    Accepts any value supported by [`URLSearchParams()`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams).
    */
  searchParams?: SearchParamsOption;

  /**
    A prefix to prepend to the `input` URL when making the request. It can be any valid URL, either relative or absolute. A trailing slash `/` is optional and will be added automatically, if needed, when it is joined with `input`. Only takes effect when `input` is a string. The `input` argument cannot start with a slash `/` when using this option.

    Useful when used with [`client.extend()`](#clientextenddefaultoptions) to create niche-specific client-instances.

    Notes:
     - After `prefixUrl` and `input` are joined, the result is resolved against the [base URL](https://developer.mozilla.org/en-US/docs/Web/API/Node/baseURI) of the page (if any).
     - Leading slashes in `input` are disallowed when using this option to enforce consistency and avoid confusion about how the `input` URL is handled, given that `input` will not follow the normal URL resolution rules when `prefixUrl` is being used, which changes the meaning of a leading slash.

    */
  prefixUrl?: URL | string;

  /**
    An object representing `limit`, `methods`, `statusCodes` and `maxRetryAfter` fields for maximum retry count, allowed methods, allowed status codes and maximum [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) time.

    If `retry` is a number, it will be used as `limit` and other defaults will remain in place.

    If `maxRetryAfter` is set to `undefined`, it will use `options.timeout`. If [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) header is greater than `maxRetryAfter`, it will cancel the request.

    Delays between retries is calculated with the function `0.3 * (2 ** (retry - 1)) * 1000`, where `retry` is the attempt number (starts from 1).

    Retries are not triggered following a timeout.

    */
  retry?: RetryOptions | number;

  /**
    Timeout in milliseconds for getting a response, including any retries. Can not be greater than 2147483647.
    If set to `false`, there will be no timeout.

    @default 10000
    */
  timeout?: number | false;

  /**
    Hooks allow modifications during the request lifecycle. Hook functions may be async and are run serially.
    */
  hooks?: Hooks;

  /**
    Throw an `HTTPError` when, after following redirects, the response has a non-2xx status code. To also throw for redirects instead of following them, set the [`redirect`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters) option to `'manual'`.

    Setting this to `false` may be useful if you are checking for resource availability and are expecting error responses.

    Note: If `false`, error responses are considered successful and the request will not be retried.

    @default true
    */
  throwHttpErrors?: boolean;

  /**
    Download progress event handler.

    @param chunk - Note: It's empty for the first call.

    */
  onDownloadProgress?: (progress: DownloadProgress, chunk: Uint8Array) => void;

  /**
    User-defined `fetch` function.
    Has to be fully compatible with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) standard.

    Use-cases:
    1. Use custom `fetch` implementations like [`isomorphic-unfetch`](https://www.npmjs.com/package/isomorphic-unfetch).
    2. Use the `fetch` wrapper function provided by some frameworks that use server-side rendering (SSR).

    @default fetch

    */
  fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
} & Omit<RequestInit, 'headers'>;

export type InternalOptions = Required<
  Omit<Options, 'hooks' | 'retry'>,
  'credentials' | 'fetch' | 'prefixUrl' | 'timeout'
> & {
  headers: Required<Headers>;
  hooks: Required<Hooks>;
  retry: Required<RetryOptions>;
  prefixUrl: string;
};

/**
Normalized options passed to the `fetch` call and the `beforeRequest` hooks.
*/
export type NormalizedOptions = {
  // Extended from `RequestInit`, but ensured to be set (not optional).
  method: RequestInit['method'];
  credentials: RequestInit['credentials'];

  // Extended from custom `clientOptions`, but ensured to be set (not optional).
  retry: RetryOptions;
  prefixUrl: string;
  onDownloadProgress: Options['onDownloadProgress'];
} & RequestInit;

export class HttpClient {
  static create(input: Input, options: Options): ResponsePromise {
    const client = new HttpClient(input, options);

    const fn = async (): Promise<Response> => {
      if (typeof client._options.timeout === 'number' && client._options.timeout > maxSafeTimeout) {
        throw new RangeError(`The \`timeout\` option cannot be greater than ${maxSafeTimeout}`);
      }

      // Delay the fetch so that body method shortcuts can set the Accept header
      await Promise.resolve();
      let response = await client._fetch();

      for (const hook of client._options.hooks.afterResponse) {
        const modifiedResponse = await hook(
          client.request,
          client._options as NormalizedOptions,
          client._decorateResponse(response.clone()),
        );

        if (modifiedResponse instanceof globalThis.Response) {
          response = modifiedResponse;
        }
      }

      client._decorateResponse(response);

      if (!response.ok && client._options.throwHttpErrors) {
        let error = new HTTPError(
          response,
          client.request,
          client._options as unknown as NormalizedOptions,
        );

        for (const hook of client._options.hooks.beforeError) {
          error = await hook(error);
        }

        throw error;
      }

      if (client._options.onDownloadProgress) {
        if (typeof client._options.onDownloadProgress !== 'function') {
          throw new TypeError('The `onDownloadProgress` option must be a function');
        }

        if (!supportsResponseStreams) {
          throw new Error(
            'Streams are not supported in your environment. `ReadableStream` is missing.',
          );
        }

        return client._stream(response.clone(), client._options.onDownloadProgress);
      }

      return response;
    };

    // const isRetriableMethod = client._options.retry.methods.includes(client.request.method.toLowerCase())
    const result = fn() as ResponsePromise; // (isRetriableMethod ? client._retry(fn) : fn()) as ResponsePromise

    for (const [type, mimeType] of Object.entries(responseTypes) as ObjectEntries<
      typeof responseTypes
    >) {
      result[type] = async () => {
        client.request.headers.set('accept', client.request.headers.get('accept') || mimeType);

        const awaitedResult = await result;
        const response = awaitedResult.clone();

        if (type === 'json') {
          if (response.status === 204) {
            return '';
          }

          const arrayBuffer = await response.clone().arrayBuffer();
          const responseSize = arrayBuffer.byteLength;
          if (responseSize === 0) {
            return '';
          }

          if (options.parseJson) {
            return options.parseJson(await response.text());
          }
        }

        return response[type]();
      };
    }

    return result;
  }

  public request: Request;
  protected abortController?: AbortController;
  protected _retryCount = 0;
  protected _input: Input;
  protected _options: InternalOptions;

  constructor(input: Input, options: Options = {}) {
    this._input = input;
    this._options = {
      // TODO: credentials can be removed when the spec change is implemented in all browsers. Context: https://www.chromestatus.com/feature/4539473312350208
      credentials: (this._input as Request).credentials || 'same-origin',
      ...options,
      headers: mergeHeaders((this._input as Request).headers, options.headers),
      hooks: deepMerge<Required<Hooks>>(
        {
          beforeRequest: [],
          beforeRetry: [],
          beforeError: [],
          afterResponse: [],
        },
        options.hooks,
      ),
      method: normalizeRequestMethod(options.method ?? (this._input as Request).method),

      prefixUrl: String(options.prefixUrl || ''),
      retry: normalizeRetryOptions(options.retry),
      throwHttpErrors: options.throwHttpErrors !== false,
      timeout: options.timeout ?? 10_000,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    };

    if (
      typeof this._input !== 'string' &&
      !(this._input instanceof URL || this._input instanceof globalThis.Request)
    ) {
      throw new TypeError('`input` must be a string, URL, or Request');
    }

    if (this._options.prefixUrl && typeof this._input === 'string') {
      if (this._input.startsWith('/')) {
        throw new Error('`input` must not begin with a slash when using `prefixUrl`');
      }

      if (!this._options.prefixUrl.endsWith('/')) {
        this._options.prefixUrl += '/';
      }

      this._input = this._options.prefixUrl + this._input;
    }

    if (supportsAbortController) {
      this.abortController = new globalThis.AbortController();
      if (this._options.signal) {
        const originalSignal = this._options.signal;

        this._options.signal.addEventListener('abort', () => {
          this.abortController?.abort(originalSignal.reason);
        });
      }

      this._options.signal = this.abortController.signal;
    }

    if (supportsRequestStreams) {
      // @ts-expect-error - Types are outdated.
      this._options.duplex = 'half';
    }

    this.request = new globalThis.Request(this._input as RequestInfo, this._options as RequestInit);
    if (this._options.searchParams) {
      const textSearchParams =
        typeof this._options.searchParams === 'string'
          ? this._options.searchParams.replace(/^\?/, '')
          : new URLSearchParams(
              this._options.searchParams as unknown as SearchParamsInit,
            ).toString();
      const searchParams = `?${textSearchParams}`;
      const url = this.request.url.replace(/(?:\?.*?)?(?=#|$)/, searchParams);

      // To provide correct form boundary, Content-Type header should be deleted each time when new Request instantiated from another one
      if (
        ((supportsFormData && this._options.body instanceof globalThis.FormData) ||
          this._options.body instanceof URLSearchParams) &&
        !(
          this._options.headers && (this._options.headers as Record<string, string>)['content-type']
        )
      ) {
        this.request.headers.delete('content-type');
      }

      // The spread of `this.request` is required as otherwise it misses the `duplex` option for some reason and throws.
      this.request = new globalThis.Request(
        new globalThis.Request(url, { ...this.request }),
        this._options as RequestInit,
      );
    }

    if (this._options.json !== undefined) {
      this._options.body = JSON.stringify(this._options.json);
      this.request.headers.set(
        'content-type',
        this._options.headers.get('content-type') ?? 'application/json',
      );
      this.request = new globalThis.Request(this.request, { body: this._options.body });
    }
  }

  protected _calculateRetryDelay(error: unknown) {
    this._retryCount++;

    if (this._retryCount < this._options.retry.limit && !(error instanceof TimeoutError)) {
      if (error instanceof HTTPError) {
        if (!this._options.retry.statusCodes.includes(error.response.status)) {
          return 0;
        }

        const retryAfter = error.response.headers.get('Retry-After');
        if (retryAfter && this._options.retry.afterStatusCodes.includes(error.response.status)) {
          let after = Number(retryAfter);
          if (Number.isNaN(after)) {
            after = Date.parse(retryAfter) - Date.now();
          } else {
            after *= 1000;
          }

          if (
            this._options.retry.maxRetryAfter !== undefined &&
            after > this._options.retry.maxRetryAfter
          ) {
            return 0;
          }

          return after;
        }

        if (error.response.status === 413) {
          return 0;
        }
      }

      const BACKOFF_FACTOR = 0.3;
      return Math.min(
        this._options.retry.backoffLimit,
        BACKOFF_FACTOR * 2 ** (this._retryCount - 1) * 1000,
      );
    }

    return 0;
  }

  protected _decorateResponse(response: Response): Response {
    if (this._options.parseJson) {
      response.json = async () => this._options.parseJson?.(await response.text());
    }

    return response;
  }

  protected async _retry<T extends (...args: any) => Promise<any>>(
    fn: T,
  ): Promise<ReturnType<T> | undefined> {
    try {
      return await fn();
    } catch (error) {
      const ms = Math.min(this._calculateRetryDelay(error), maxSafeTimeout);
      if (ms !== 0 && this._retryCount > 0) {
        await delay(ms, { signal: this._options.signal });

        for (const hook of this._options.hooks.beforeRetry) {
          const hookResult = await hook({
            request: this.request,
            options: this._options as unknown as NormalizedOptions,
            error: error as Error,
            retryCount: this._retryCount,
          });

          // If `stop` is returned from the hook, the retry process is stopped
          if (hookResult === stop) {
            return;
          }
        }

        return this._retry(fn);
      }

      throw error;
    }
  }

  protected async _fetch(): Promise<Response> {
    for (const hook of this._options.hooks.beforeRequest) {
      const result = await hook(this.request, this._options as unknown as NormalizedOptions);

      if (result instanceof Request) {
        this.request = result;
        break;
      }

      if (result instanceof Response) {
        return result;
      }
    }

    if (this._options.timeout === false) {
      return this._options.fetch(this.request.clone());
    }

    return timeout(this.request.clone(), this.abortController, this._options as TimeoutOptions);
  }

  /* istanbul ignore next */
  protected _stream(response: Response, onDownloadProgress: Options['onDownloadProgress']) {
    const totalBytes = Number(response.headers.get('content-length')) || 0;
    let transferredBytes = 0;

    if (response.status === 204) {
      if (onDownloadProgress) {
        onDownloadProgress({ percent: 1, totalBytes, transferredBytes }, new Uint8Array());
      }

      return new globalThis.Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return new globalThis.Response(
      new globalThis.ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();

          if (onDownloadProgress) {
            onDownloadProgress({ percent: 0, transferredBytes: 0, totalBytes }, new Uint8Array());
          }

          async function read() {
            if (!reader) {
              controller.close();
              return;
            }

            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }

            if (onDownloadProgress) {
              transferredBytes += value.byteLength;
              const percent = totalBytes === 0 ? 0 : transferredBytes / totalBytes;
              onDownloadProgress({ percent, transferredBytes, totalBytes }, value);
            }

            controller.enqueue(value);
            await read();
          }

          await read();
        },
      }),
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
    );
  }
}

const createInstance = (defaults?: Partial<Options>): HttpClientInstance => {
  const client: Partial<Mutable<HttpClientInstance>> = (input: Input, options?: Options) =>
    HttpClient.create(input, validateAndMerge(defaults, options));

  for (const method of requestMethods) {
    client[method] = (input: Input, options?: Options) => {
      return HttpClient.create(input, validateAndMerge(defaults, options, { method }));
    };
  }

  client.create = (newDefaults?: Partial<Options>) => createInstance(validateAndMerge(newDefaults));
  client.extend = (newDefaults?: Partial<Options>) =>
    createInstance(validateAndMerge(defaults, newDefaults));
  client.stop = stop;

  return client as HttpClientInstance;
};

export const httpClient = createInstance();
