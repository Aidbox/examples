import { getIronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import assert from "node:assert";

export async function getSession<T extends object>(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const password = process.env.SESSION_PASSWORD;
  assert(password, "Environment variable SESSION_PASSWORD is required");

  return await getIronSession<T>(request, response, {
    password,
    cookieName: "iron-session",
  });
}
