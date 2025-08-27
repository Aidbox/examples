import Fastify from 'fastify';
import healthcheck from 'fastify-healthcheck';
import dotenv from 'dotenv';
import { Resource } from '@aidbox/sdk-r4/types';

const requestToString = (request: AidboxRequest["operation"]["request"]) => {
  return "/" + request.map((item) => {
    if (typeof item === "string") return item;
    return `:${item.name}`;
  }).join("/");
};

dotenv.config();

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
  
  
  if ("/fhir/Questionnaire/:id" === requestToString(rest)) {
    return res.status(200).send({ from: operation.app.id, message: "Hello from the Aidbox App" });
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