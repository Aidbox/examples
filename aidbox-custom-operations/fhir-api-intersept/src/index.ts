import Fastify from 'fastify';
import healthcheck from 'fastify-healthcheck';
import dotenv from 'dotenv';

const requestToString = (request: AidboxRequest["operation"]["request"]) => {
  return "/" + request.map((item) => {
    if (typeof item === "string") return item;
    return `:${item.name}`;
  }).join("/");
};

dotenv.config();

if (!process.env.BOX_WEB_BASE_URL) throw "BOX_WEB_BASE_URL is not provided!"
if (!process.env.BOX_ROOT_CLIENT_ID) throw "BOX_ROOT_CLIENT_ID is not provided!"
if (!process.env.BOX_ROOT_CLIENT_SECRET) throw "BOX_ROOT_CLIENT_SECRET is not provided!"

console.log(process.env.BOX_WEB_BASE_URL)
const aidbox = async (path: string, options: RequestInit = {}) => {
    const url = `${process.env.BOX_WEB_BASE_URL}${path}`;
    const username = process.env.BOX_ROOT_CLIENT_ID;
    const password = process.env.BOX_ROOT_CLIENT_SECRET;
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, headers });
};

const fastify = Fastify({
  logger: true
});

fastify.register(healthcheck);

interface AidboxRequest {
  type: "operation",
  request: {
    resource?: any; // body from Aidbox request
    params: Record<string, string>;
    "route-params": Record<string, string>;
    headers: Record<string, string>;
    "oauth/user"?: Record<string, string>;
    "oauth/client"?: Record<string, string>;
  },
  operation: {
    app: { id: string; resourceType: "App" };
    action: "proto.app/endpoint";
    module: string;
    request: Array<string | { name: string }>;
    id: string;
  }
}

fastify.post<{ Body: AidboxRequest }>('/', async (req, res) => {
  const { operation, request } = req.body;
  const [method, ...rest] = operation.request;
  
  console.log("Incoming request:", requestToString(rest))
  console.log("Method:", method)
  console.log("Data:", request.resource)

  if ("/fhir/Encounter" === requestToString(rest) && method === "post") {
    const encounter = { ...request.resource, identifier: [{ system: "organization-1", value: "00001" }] };
    
    // Here you can do any kind of interception logic: run functions, make async http calls etc.
    // In this case we update Encounter resource with identifier, save it and response with original OperationOutcome:
    
    const response = await aidbox('/Encounter', { method: "POST", body: JSON.stringify(encounter) });

    const operationOutcome = await response.json();

    console.dir(operationOutcome)

    return res.status(response.status).send(operationOutcome);
  }

  return res.status(404).send({ error: "Not Supported" });
});

const start = async () => {
  try {
    const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 4000;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start(); 