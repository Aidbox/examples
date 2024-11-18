import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);

  await smart.authorize({
    clientId: "aidbox-forms",
    redirectUri: "http://localhost:3000/api/launch/ready",
  });
}
