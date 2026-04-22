import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import type { Bundle, BundleEntry } from "./fhir-types/hl7-fhir-r4-core/Bundle";
import type { Observation } from "./fhir-types/hl7-fhir-r4-core/Observation";
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import {
  USCoreBloodPressureProfile,
  USCorePatientProfile,
} from "./fhir-types/hl7-fhir-us-core/profiles";

type Row = {
  mrn: string;
  family: string;
  given: string;
  birthDate: string;
  gender: string;
  raceCode: string;
  raceDisplay: string;
  effectiveDateTime: string;
  systolic: string;
  diastolic: string;
};

const parseCsv = (path: string): Row[] => {
  const [header, ...lines] = readFileSync(path, "utf8").trim().split("\n");
  const cols = header!.split(",");
  return lines.map(line => {
    const values = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, values[i]])) as Row;
  });
};

const rowToPatient = (row: Row): USCorePatientProfile => {
  const basePatient: Patient = {
    resourceType: "Patient",
    identifier: [{ system: "http://hospital.example.org/mrn", value: row.mrn }],
    name: [{ family: row.family, given: [row.given] }],
    gender: row.gender as Patient["gender"],
    birthDate: row.birthDate,
  };

  const patient = USCorePatientProfile.apply(basePatient);

  patient.setRace({
    ombCategory: { system: "urn:oid:2.16.840.1.113883.6.238", code: row.raceCode, display: row.raceDisplay },
    text: row.raceDisplay,
  });

  return patient;
};

const rowToBP = (row: Row, patientRef: `urn:uuid:${string}`): USCoreBloodPressureProfile => {
  const bp = USCoreBloodPressureProfile.create({
    status: "final",
    subject: { reference: patientRef },
  });

  bp
    .setEffectiveDateTime(row.effectiveDateTime)
    .setSystolic({ value: Number(row.systolic), unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" })
    .setDiastolic({ value: Number(row.diastolic), unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" });

  const { errors } = bp.validate();
  if (errors.length) throw new Error(`${row.mrn}: ${errors.join("; ")}`);

  return bp;
};

const rowToEntries = (row: Row): BundleEntry[] => {
  const patientUrn: `urn:uuid:${string}` = `urn:uuid:${randomUUID()}`;
  const patient = rowToPatient(row);
  const bp = rowToBP(row, patientUrn);

  return [
    { fullUrl: patientUrn, resource: patient.toResource(), request: { method: "POST", url: "Patient" } },
    { fullUrl: `urn:uuid:${randomUUID()}`, resource: bp.toResource(), request: { method: "POST", url: "Observation" } },
  ];
};

const rows = parseCsv("./patients.csv");
console.log(`Loaded ${rows.length} rows`);

const bundle: Bundle = {
  resourceType: "Bundle",
  type: "transaction",
  entry: rows.flatMap(rowToEntries),
};

writeFileSync("./bundle.json", JSON.stringify(bundle, null, 2));
console.log(`Wrote bundle with ${bundle.entry!.length} entries`);

// Read back: compute average systolic/diastolic
const bps = (bundle.entry ?? [])
  .map(e => e.resource)
  .filter((r): r is Observation => r?.resourceType === "Observation")
  .map(o => USCoreBloodPressureProfile.from(o));

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const systolic = bps.map(bp => bp.getSystolic()!.value!);
const diastolic = bps.map(bp => bp.getDiastolic()!.value!);

console.log(`Avg BP: ${avg(systolic).toFixed(1)}/${avg(diastolic).toFixed(1)} mmHg (n=${bps.length})`);
