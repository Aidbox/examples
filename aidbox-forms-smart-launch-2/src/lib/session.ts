import { getIronSession, IronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
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

  const options = { password: password as string, cookieName: "iron-session" };

  return !request || !response
    ? await getIronSession<T>(await cookies(), options)
    : await getIronSession<T>(request, response, options);
}
