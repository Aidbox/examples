import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/server/smart";
import { SMART_LAUNCH_CLIENT_ID, SMART_LAUNCH_SCOPES } from "@/lib/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);

  try {
    if (req.method === "POST") {
      const { scope, issuer } = req.body as { scope: string; issuer: string };

      if (!scope || !issuer) {
        return res.status(400).send("Invalid request");
      }

      return await smart.authorize({
        iss: issuer,
        clientId: SMART_LAUNCH_CLIENT_ID,
        redirectUri: "/api/launch/ready",
        scope: scope.replace(/\s+/g, " "),
      });
    }

    return await smart.authorize({
      clientId: SMART_LAUNCH_CLIENT_ID,
      redirectUri: "/api/launch/ready",
      scope: SMART_LAUNCH_SCOPES.join(" "),
    });
  } catch (e) {
    res.status(400).json({
      error: `Failed to authorize: ${(e as { message?: string })?.message || "Unknown error"}`,
    });
  }
}
