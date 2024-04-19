import { Client as AidboxClient } from "@aidbox/sdk-r4";
import Fastify from "fastify";
import fastifyHealthcheck from "fastify-healthcheck";

import { operations, handleOperation } from "./operations.js";
import { getConfig } from "./config.js";
import { Config, Client, Request } from "./types.js";

const fastify = Fastify({ logger: true });

fastify.register(fastifyHealthcheck, { exposeUptime: true });

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
  }
  interface FastifyRequest {
    appToken: string;
    aidboxClient: Client;
    appConfig: Config;
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
    request.appConfig = config;
    done();
  });

  fastify.get("/", async function handler() {
    return { message: "Hello my friend" };
  });

  fastify.post("/", async (request: Request, reply) => {
    return await handleOperation(request, reply);
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

    await http.put("App/my-app", {
      json: {
        resourceType: "App",
        type: "app",
        apiVersion: 1,
        endpoint: {
          url: config.app.baseUrl,
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
