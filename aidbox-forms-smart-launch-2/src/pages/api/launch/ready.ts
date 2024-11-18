import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";
import { createOrganization, getOrganizationalAidbox } from "@/lib/aidbox";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  const client = await smart.ready();
  await createOrganization(client.state.serverUrl);

  const aidbox = getOrganizationalAidbox(client.state.serverUrl);

  await aidbox.post("fhir/Patient", {
    json: await client.patient.read(),
  });

  res.redirect(302, "/dashboard");
}
