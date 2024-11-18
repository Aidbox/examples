import { getIronSession, IronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import assert from "node:assert";
import { cookies } from "next/headers";

export async function getSession<T extends object>(): Promise<IronSession<T>>;
export async function getSession<T extends object>(
  request: NextApiRequest,
  response: NextApiResponse,
): Promise<IronSession<T>>;
export async function getSession<T extends object>(
  request?: NextApiRequest,
  response?: NextApiResponse,
): Promise<IronSession<T>> {
  const password = process.env.SESSION_PASSWORD;
  assert(password, "Environment variable SESSION_PASSWORD is required");

  const options = { password, cookieName: "iron-session" };

  return !request || !response
    ? await getIronSession<T>(await cookies(), options)
    : await getIronSession<T>(request, response, options);
}
