import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/server/smart";
import { saveSyncStats, sync } from "@/lib/server/sync";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  const client = await smart.ready();

  const resources = await sync(client);
  await saveSyncStats(resources, req, res);

  res.redirect(302, "/dashboard");
}
