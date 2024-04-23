import { Client as AidboxClient } from "@aidbox/sdk-r4";
import { FastifyRequest } from "fastify";

type BasicAuthorization = {
  method: "basic";
  credentials: {
    username: string;
    password: string;
  };
};

export type Client = AidboxClient<BasicAuthorization>;
export type Request = FastifyRequest<{
  Params: { id: string };
  Body: {
    type?: string;
    operation: {
      id?: string;
    };
    request: {
      params: {};
      "route-params": Record<string, any>;
      headers: Record<string, any>;
      "oauth/user": Record<string, any>;
    };
  };
}>;

export interface Config {
  app: {
    port: number;
    baseUrl: string;
    callbackUrl: string;
    secret: string;
  };
  aidbox: {
    url: string;
    client: {
      id: string;
      secret: string;
    };
  };
}
