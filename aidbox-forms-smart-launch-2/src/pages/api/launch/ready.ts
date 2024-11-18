import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";
import { createOrganization } from "@/lib/aidbox";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  const client = await smart.ready();
  await createOrganization(client.state.serverUrl);

  res.redirect(302, "/dashboard");
}
