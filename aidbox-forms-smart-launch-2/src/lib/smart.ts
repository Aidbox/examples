import { IronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import BaseServerStorage from "fhirclient/lib/storage/BrowserStorage";
import BaseNodeAdapter from "fhirclient/lib/adapters/NodeAdapter";
import { getSession } from "@/lib/session";

class ServerStorage extends BaseServerStorage {
  constructor(private session: IronSession<any>) {
    super();
  }

  async get(key: string) {
    return this.session[key];
  }

  async set(key: string, value: any) {
    this.session[key] = value;
    return value;
  }

  async unset(key: string) {
    if (key in this.session) {
      delete this.session[key];
      return true;
    }
    return false;
  }
}

class NodeAdapter extends BaseNodeAdapter {
  constructor(
    request: NextApiRequest,
    response: NextApiResponse,
    private session: IronSession<any>,
  ) {
    super({
      request,
      response,
      storage: new ServerStorage(session),
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
  return new NodeAdapter(
    request,
    response,
    await getSession(request, response),
  ).getSmartApi();
}
