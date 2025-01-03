import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/server/smart";
import { sync } from "@/lib/server/sync";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  const client = await smart.ready();

  await sync(client);

  res.redirect(302, "/dashboard");
}
