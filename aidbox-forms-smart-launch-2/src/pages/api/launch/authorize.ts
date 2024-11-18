import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);

  await smart.authorize({
    clientId: "aidbox-forms",
    redirectUri: "/api/launch/ready",
    scope:
      "openid fhirUser profile offline_access launch launch/patient patient/*.rs user/*.rs",
  });
}
