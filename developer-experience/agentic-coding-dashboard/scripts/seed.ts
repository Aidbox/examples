import { aidbox } from "../src/aidbox";
import type { Patient } from "../src/fhir-types/hl7-fhir-r4-core/Patient";
import type { Observation } from "../src/fhir-types/hl7-fhir-r4-core/Observation";
import type { Bundle, BundleEntry } from "../src/fhir-types/hl7-fhir-r4-core/Bundle";

const patients: Patient[] = [
  {
    resourceType: "Patient",
    id: "pt-1",
    name: [{ given: ["Alice"], family: "Smith", use: "official" }],
    gender: "female",
    birthDate: "1990-03-15",
    active: true,
    telecom: [
      { system: "phone", value: "555-0101" },
      { system: "email", value: "alice@example.com" },
    ],
  },
  {
    resourceType: "Patient",
    id: "pt-2",
    name: [{ given: ["Bob"], family: "Johnson", use: "official" }],
    gender: "male",
    birthDate: "1985-07-22",
    active: true,
    telecom: [{ system: "phone", value: "555-0102" }],
  },
];

// 10 body weight observations per patient, monthly readings over ~10 months
// Alice: weight trending 65 -> 62 kg (gradual decrease)
// Bob: weight trending 82 -> 85 kg (gradual increase)
const observations: Observation[] = [
  // Alice - Body weight (monthly, Jan-Oct 2025)
  { resourceType: "Observation", id: "obs-alice-wt-01", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-01-15", valueQuantity: { value: 65.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-02", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-02-12", valueQuantity: { value: 64.5, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-03", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-03-10", valueQuantity: { value: 64.8, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-04", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-04-14", valueQuantity: { value: 64.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-05", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-05-19", valueQuantity: { value: 63.5, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-06", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-06-16", valueQuantity: { value: 63.2, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-07", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-07-21", valueQuantity: { value: 63.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-08", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-08-18", valueQuantity: { value: 62.7, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-09", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-09-15", valueQuantity: { value: 62.3, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-alice-wt-10", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-1" }, effectiveDateTime: "2025-10-13", valueQuantity: { value: 62.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },

  // Bob - Body weight (monthly, Jan-Oct 2025)
  { resourceType: "Observation", id: "obs-bob-wt-01", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-01-20", valueQuantity: { value: 82.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-02", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-02-17", valueQuantity: { value: 82.4, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-03", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-03-17", valueQuantity: { value: 82.8, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-04", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-04-21", valueQuantity: { value: 83.1, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-05", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-05-19", valueQuantity: { value: 83.5, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-06", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-06-23", valueQuantity: { value: 83.9, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-07", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-07-21", valueQuantity: { value: 84.2, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-08", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-08-18", valueQuantity: { value: 84.5, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-09", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-09-22", valueQuantity: { value: 84.8, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
  { resourceType: "Observation", id: "obs-bob-wt-10", status: "final", code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] }, subject: { reference: "Patient/pt-2" }, effectiveDateTime: "2025-10-20", valueQuantity: { value: 85.0, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" } },
];

const entries: BundleEntry[] = [
  ...patients.map((p): BundleEntry => ({
    resource: p,
    request: { method: "PUT", url: `Patient/${p.id}` },
  })),
  ...observations.map((o): BundleEntry => ({
    resource: o,
    request: { method: "PUT", url: `Observation/${o.id}` },
  })),
];

const result = await aidbox.transaction({
  format: "application/fhir+json",
  bundle: {
    resourceType: "Bundle",
    type: "transaction" as const,
    entry: entries,
  },
});

if (result.isOk()) {
  console.log(`Seeded ${patients.length} patients and ${observations.length} observations`);
} else {
  console.error("Seed failed:", JSON.stringify(result.value.resource, null, 2));
  process.exit(1);
}
