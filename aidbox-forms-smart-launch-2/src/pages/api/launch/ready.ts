import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  await smart.ready();

  res.redirect(302, "/api/launch/test");
}
