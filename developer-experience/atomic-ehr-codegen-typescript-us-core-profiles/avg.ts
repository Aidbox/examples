import { readFileSync } from "node:fs";

import type { Bundle } from "./fhir-types/hl7-fhir-r4-core/Bundle";
import type { Observation } from "./fhir-types/hl7-fhir-r4-core/Observation";
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import { USCoreBloodPressureProfile } from "./fhir-types/hl7-fhir-us-core/profiles";

const bundle: Bundle<Patient | Observation> = JSON.parse(readFileSync("./bundle.json", "utf8"));

const bps = (bundle.entry ?? [])
  .map(e => e.resource)
  .filter(USCoreBloodPressureProfile.is)
  .map(o => USCoreBloodPressureProfile.from(o));

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const systolic = bps.map(bp => bp.getSystolic()!.value!);
const diastolic = bps.map(bp => bp.getDiastolic()!.value!);

console.log(`Avg BP: ${avg(systolic).toFixed(1)}/${avg(diastolic).toFixed(1)} mmHg (n=${bps.length})`);
