import { IronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import BaseServerStorage from "fhirclient/lib/storage/BrowserStorage";
import BaseNodeAdapter from "fhirclient/lib/adapters/NodeAdapter";
import Client from "fhirclient/lib/Client";
import { SMART_KEY } from "fhirclient/lib/settings";
import { getSession } from "@/lib/server/session";
import { cache } from "react";
import {
  CapabilityStatement,
  CapabilityStatementImplementation,
  Encounter,
  Patient,
  Practitioner,
} from "fhir/r4";
import { createRedis } from "@/lib/server/redis";
import { getOrganizationalAidbox } from "@/lib/server/aidbox";
import Redis from "ioredis";
import { redirect } from "next/navigation";

interface SmartSession {
  [SMART_KEY]: string | undefined;
}

class HybridStorage extends BaseServerStorage {
  constructor(
    private session: IronSession<SmartSession>,
    private redis: Redis,
  ) {
    super();
  }

  async get(key: string) {
    if (key === SMART_KEY) {
      return this.session[key];
    } else {
      const value = await this.redis.get(`smart:${key}`);
      return value != null ? JSON.parse(value) : undefined;
    }
  }

  async set(key: string, value: any) {
    if (key === SMART_KEY) {
      this.session[key] = value;
    } else {
      await this.redis.set(`smart:${key}`, JSON.stringify(value));
    }
    return value;
  }

  async unset(key: string) {
    if (key === SMART_KEY) {
      if (key in this.session) {
        delete this.session[key];
        return true;
      }
      return false;
    } else {
      const deleted = await this.redis.del(`smart:${key}`);
      return deleted > 0;
    }
  }

  async state() {
    const key = await this.get(SMART_KEY);
    if (key) {
      return await this.get(key);
    }
  }
}

class NodeAdapter extends BaseNodeAdapter {
  constructor(
    request: NextApiRequest,
    response: NextApiResponse,
    private session: IronSession<any>,
    private redis: Redis,
  ) {
    super({
      request,
      response,
      storage: new HybridStorage(session, redis),
    });
  }

  async redirect(location: string) {
    await this.session.save();
    super.redirect(location);
  }
}

export async function getSmartApi(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const session = await getSession(request, response);
  const api = new NodeAdapter(
    request,
    response,
    session,
    await createRedis(),
  ).getSmartApi();

  return {
    ...api,
    ready: async () => {
      const client = await api.ready();
      await session.save();
      return client;
    },
  } as typeof api;
}

export const getCapabilityStatement = async (client: Client) => {
  const capabilityStatement = await client
    .request<CapabilityStatement>("/metadata")
    .catch((e) => {
      console.error(`Failed to read capability statement: ${e.message}`);
      return {} as CapabilityStatement;
    });

  if (capabilityStatement.implementation?.url !== client.state.serverUrl) {
    capabilityStatement.implementation =
      capabilityStatement.implementation ||
      ({} as CapabilityStatementImplementation);
    capabilityStatement.implementation.url = client.state.serverUrl;
  }

  return capabilityStatement;
};

export const getCurrentClient = cache(async () => {
  const storage = new HybridStorage(
    await getSession<SmartSession>(),
    await createRedis(),
  );
  const state = await storage.state();

  if (!state) {
    redirect("/help");
  }

  return new Client(new BaseNodeAdapter({ storage } as any), state);
});

export const getCurrentPatient = cache(async () => {
  const client = await getCurrentClient();
  const patient = await client.patient.read();
  return patient as Patient;
});

export const getCurrentUser = cache(async () => {
  const client = await getCurrentClient();
  const user = await client.user.read();
  return user as Patient | Practitioner;
});

export const getCurrentEncounter = cache(async () => {
  const client = await getCurrentClient();
  const encounter = await client.encounter.read();
  return encounter as Encounter;
});

export const getCurrentAidbox = cache(async () => {
  const client = await getCurrentClient();
  return getOrganizationalAidbox(client.state.serverUrl);
});
