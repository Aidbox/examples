import { NextApiRequest, NextApiResponse } from "next";
import { getSmartApi } from "@/lib/smart";
import { Bundle, Patient } from "fhir/r4";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const smart = await getSmartApi(req, res);
  const client = await smart.ready();

  const patient = await client.request<Bundle<Patient>>("Patient");

  res.status(200).json({ patient: client.state });
}
