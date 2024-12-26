import { Client as AidboxClient } from "@aidbox/sdk-r4";
import Fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";
import { getConfig } from "./config.js";
import { Config, Client, Request, Operations, HttpClient } from "./types.js";
import { dispatch } from "./dispatch.js";
import * as operations from "./operations.js";

const fastify = Fastify({ logger: true });

fastify.register(fastifyHealthcheck, { exposeUptime: true });

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
  }
  interface FastifyRequest {
    appToken: string;
    aidboxClient: Client;
    http: HttpClient;
    appConfig: Config;
    operations: Operations;
  }
}

const main = async () => {
  const config = getConfig();
  const aidboxClient = new AidboxClient(config.aidbox.url, {
    auth: {
      method: "basic",
      credentials: {
        username: config.aidbox.client.id,
        password: config.aidbox.client.secret,
      },
    },
  });

  const http = await aidboxClient.HTTPClient();

  fastify.decorateRequest(
    "appToken",
    Buffer.from(`${config.app.baseUrl}:${config.app.secret}`).toString("base64")
  );

  fastify.addHook("onRequest", (request, reply, done) => {
    request.aidboxClient = aidboxClient;
    done();
  });

  fastify.addHook("onRequest", (request, reply, done) => {
    request.http = http;
    done();
  });

  fastify.addHook("onRequest", (request, reply, done) => {
    request.appConfig = config;
    done();
  });

  fastify.addHook("onRequest", (request, reply, done) => {
    request.operations = operations as Operations;
    done();
  });

  fastify.get("/", async function handler() {
    return { message: "Hello my friend" };
  });

  fastify.route({
    method: "POST",
    url: config.app.callbackUrl.startsWith("/")
      ? config.app.callbackUrl
      : `/${config.app.callbackUrl}`,
    preHandler: (request, reply, done) => {
      if (!request.headers.authorization) {
        reply.statusCode = 401;
        return reply.send({
          error: { message: `Authorization header missing` },
        });
      }
      const appId = config.app.id;
      const appSecret = config.app.secret;
      const appToken = Buffer.from(`${appId}:${appSecret}`).toString("base64");
      const header = request.headers.authorization;
      const token = header && header?.split(" ")?.[1];
      if (token === appToken) {
        return done();
      }
      reply.statusCode = 401;
      reply.send({
        error: { message: `Authorization failed for app [${appId}]` },
      });
    },
    handler: (request, reply) => {
      dispatch(request as Request, reply);
    },
  });

  try {
    let isAidboxReady = false;
    let tryCount = 1;
    while (!isAidboxReady && tryCount <= 100) {
      fastify.log.info(`Check Aidbox Availability... ${tryCount}`);
      let response;
      try {
        response = await http.get("health");
      } catch (e: any) {
        if (e?.response?.status === 401) {
          fastify.log.error(`Please check your access policy for client`);
          process.exit(1);
        }

        fastify.log.error(e.message);
      }
      if (response) {
        isAidboxReady = true;
      }
      tryCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await http.put(`App/${config.app.id}`, {
      json: {
        resourceType: "App",
        type: "app",
        apiVersion: 1,
        endpoint: {
          url: `${config.app.baseUrl}${
            config.app.callbackUrl.startsWith("/")
              ? config.app.callbackUrl
              : `/${config.app.callbackUrl}`
          }`,
          type: "http-rpc",
          secret: config.app.secret,
        },
        operations,
      },
    });
    await fastify.listen({ host: "0.0.0.0", port: config.app.port });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

main();
