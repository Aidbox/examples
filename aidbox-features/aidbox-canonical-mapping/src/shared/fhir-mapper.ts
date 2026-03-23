/**
 * FHIR Mapper
 * Maps HIS (Hospital Information System) API responses to FHIR R4 resources
 */

import type { Bundle, BundleEntry } from "../fhir-types/hl7-fhir-r4-core/Bundle";
import type { Patient } from "../fhir-types/hl7-fhir-r4-core/Patient";
import type { Encounter, EncounterLocation } from "../fhir-types/hl7-fhir-r4-core/Encounter";
import type { Location } from "../fhir-types/hl7-fhir-r4-core/Location";
import type { Identifier } from "../fhir-types/hl7-fhir-r4-core/Identifier";
import type { HumanName } from "../fhir-types/hl7-fhir-r4-core/HumanName";
import type { Coding } from "../fhir-types/hl7-fhir-r4-core/Coding";
import type { CurrentInpatient, Patient as HISPatient, WardPatientData } from "./types/his";
import type { ADTPatientData, ADTEncounterData } from "./types/events";

// Re-export types for use in other modules
export type { Bundle, Patient, Encounter, Location };

// ============ Identifier Systems ============

const HIS_PATIENT_SYSTEM = "https://his.example.com/patient-id";
const HIS_SPELL_SYSTEM = "https://his.example.com/spell-id";
const HIS_WARD_SYSTEM = "https://his.example.com/ward-id";
const NATIONAL_ID_SYSTEM = "https://national-registry.example.com/patient-id";
const LOCAL_ID_SYSTEM = "https://his.example.com/local-id";

// ============ Encounter Class ============

const INPATIENT_CLASS: Coding = {
  system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code: "IMP",
  display: "inpatient encounter",
};

// ============ Mappers ============

/**
 * Map HIS Patient to FHIR Patient resource
 */
export function mapPatient(hisPatient: HISPatient): Patient {
  const identifiers: Identifier[] = [
    {
      system: HIS_PATIENT_SYSTEM,
      value: hisPatient.patientId,
    },
  ];

  // National ID
  if (hisPatient.nationalIdentifier?.value) {
    identifiers.push({
      system: NATIONAL_ID_SYSTEM,
      value: hisPatient.nationalIdentifier.value,
    });
  }

  // Local ID (Hospital Number)
  if (hisPatient.localIdentifier?.value) {
    identifiers.push({
      system: LOCAL_ID_SYSTEM,
      value: hisPatient.localIdentifier.value,
    });
  }

  // Build name
  const names: HumanName[] = [];
  if (hisPatient.forename || hisPatient.surname) {
    const given: string[] = [];
    if (hisPatient.forename) given.push(hisPatient.forename);
    if (hisPatient.otherGivenNames) given.push(hisPatient.otherGivenNames);

    const name: HumanName = {
      use: "official",
      family: hisPatient.surname,
      given: given.length > 0 ? given : undefined,
    };

    if (hisPatient.title?.description) {
      name.prefix = [hisPatient.title.description];
    }

    names.push(name);
  }

  // Preferred name
  if (hisPatient.preferredName) {
    names.push({
      use: "usual",
      text: hisPatient.preferredName,
    });
  }

  const patient: Patient = {
    resourceType: "Patient",
    id: hisPatient.patientId,
    identifier: identifiers,
    name: names.length > 0 ? names : undefined,
    gender: mapGender(hisPatient.gender?.description),
    birthDate: formatDate(hisPatient.doB),
  };

  if (hisPatient.doD) {
    patient.deceasedDateTime = hisPatient.doD;
  }

  return patient;
}

/**
 * Map gender string to FHIR gender code
 */
function mapGender(
  gender?: string
): "male" | "female" | "other" | "unknown" | undefined {
  if (!gender) return undefined;

  const lower = gender.toLowerCase();
  if (lower === "male" || lower === "m") return "male";
  if (lower === "female" || lower === "f") return "female";
  if (lower === "other" || lower === "o") return "other";
  return "unknown";
}

/**
 * Format ISO datetime to FHIR date (YYYY-MM-DD)
 */
function formatDate(isoDateTime?: string): string | undefined {
  if (!isoDateTime) return undefined;
  const match = isoDateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : isoDateTime;
}

/**
 * Map HIS CurrentInpatient to FHIR Encounter resource
 */
export function mapEncounter(
  inpatient: CurrentInpatient,
  patientRef: string,
  locationRef: string
): Encounter {
  const identifiers: Identifier[] = [
    {
      system: HIS_SPELL_SYSTEM,
      value: inpatient.spellId,
    },
  ];

  if (inpatient.externalSpellId) {
    identifiers.push({
      system: `${HIS_SPELL_SYSTEM}/external`,
      value: inpatient.externalSpellId,
    });
  }

  const encounterLocation: EncounterLocation = {
    location: {
      reference: locationRef as `Location/${string}`,
      display: inpatient.currentLocation?.wardName,
    },
    status: "active",
  };

  // Add bed information as physical type
  if (inpatient.currentLocation?.bedName) {
    encounterLocation.physicalType = {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "bd",
          display: "Bed",
        },
      ],
      text: inpatient.currentLocation.bedName,
    };
  }

  const encounter: Encounter = {
    resourceType: "Encounter",
    id: inpatient.spellId,
    identifier: identifiers,
    status: mapEncounterStatus(inpatient.status),
    class: INPATIENT_CLASS,
    subject: {
      reference: patientRef as `Patient/${string}`,
    },
    location: [encounterLocation],
  };

  if (inpatient.admissionDate) {
    encounter.period = {
      start: inpatient.admissionDate,
    };
  }

  const specialty = inpatient.currentInpatientEpisode?.currentSpecialty;
  if (specialty?.specialtyCode || specialty?.specialtyName) {
    encounter.serviceType = {
      coding: specialty.specialtyCode
        ? [
            {
              system: "https://his.example.com/specialty",
              code: specialty.specialtyCode,
              display: specialty.specialtyName,
            },
          ]
        : undefined,
      text: specialty.specialtyName,
    };
  }

  return encounter;
}

/**
 * Map HIS status to FHIR Encounter status
 */
function mapEncounterStatus(
  status?: string
): Encounter["status"] {
  if (!status) return "in-progress";

  const lower = status.toLowerCase();
  if (lower.includes("discharge") || lower.includes("finished")) return "finished";
  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("leave")) return "onleave";
  if (lower.includes("planned") || lower.includes("pending")) return "planned";
  if (lower.includes("arrived") || lower.includes("accepted")) return "arrived";

  return "in-progress";
}

/**
 * Map wardId to FHIR Location resource
 */
export function mapLocation(wardId: string, wardName?: string, siteName?: string): Location {
  return {
    resourceType: "Location",
    id: wardId,
    identifier: [
      {
        system: HIS_WARD_SYSTEM,
        value: wardId,
      },
    ],
    status: "active",
    name: wardName,
    description: siteName ? `${wardName} at ${siteName}` : wardName,
    mode: "instance",
    physicalType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "wa",
          display: "Ward",
        },
      ],
    },
  };
}

// ============ Fat Event Mappers ============

/**
 * Map ADT event patient data to FHIR Patient resource
 */
export function mapPatientFromEvent(data: ADTPatientData): Patient {
  const identifiers: Identifier[] = [
    {
      system: HIS_PATIENT_SYSTEM,
      value: data.patientId,
    },
  ];

  if (data.nationalId) {
    identifiers.push({
      system: NATIONAL_ID_SYSTEM,
      value: data.nationalId,
    });
  }

  if (data.localId) {
    identifiers.push({
      system: LOCAL_ID_SYSTEM,
      value: data.localId,
    });
  }

  const names: HumanName[] = [];
  if (data.forename || data.surname) {
    const given: string[] = [];
    if (data.forename) given.push(data.forename);
    if (data.otherGivenNames) given.push(data.otherGivenNames);

    const name: HumanName = {
      use: "official",
      family: data.surname,
      given: given.length > 0 ? given : undefined,
    };

    if (data.title) {
      name.prefix = [data.title];
    }

    names.push(name);
  }

  if (data.preferredName) {
    names.push({
      use: "usual",
      text: data.preferredName,
    });
  }

  const patient: Patient = {
    resourceType: "Patient",
    id: data.patientId,
    identifier: identifiers,
    name: names.length > 0 ? names : undefined,
    gender: mapGender(data.gender),
    birthDate: formatDate(data.birthDate),
  };

  if (data.deceasedDateTime) {
    patient.deceasedDateTime = data.deceasedDateTime;
  }

  return patient;
}

/**
 * Map ADT event encounter data to FHIR Encounter resource
 */
export function mapEncounterFromEvent(
  data: ADTEncounterData,
  patientRef: string,
  locationRef: string
): Encounter {
  const status: Encounter["status"] = data.status ?? "in-progress";
  const identifiers: Identifier[] = [
    {
      system: HIS_SPELL_SYSTEM,
      value: data.spellId,
    },
  ];

  if (data.externalSpellId) {
    identifiers.push({
      system: `${HIS_SPELL_SYSTEM}/external`,
      value: data.externalSpellId,
    });
  }

  const encounterLocation: EncounterLocation = {
    location: {
      reference: locationRef as `Location/${string}`,
      display: data.wardName,
    },
    status: "active",
  };

  if (data.bedName) {
    encounterLocation.physicalType = {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "bd",
          display: "Bed",
        },
      ],
      text: data.bedName,
    };
  }

  const encounter: Encounter = {
    resourceType: "Encounter",
    id: data.spellId,
    identifier: identifiers,
    status,
    class: INPATIENT_CLASS,
    subject: {
      reference: patientRef as `Patient/${string}`,
    },
    location: [encounterLocation],
  };

  if (data.admissionDate) {
    encounter.period = {
      start: data.admissionDate,
    };
  }

  if (data.dischargeDate && encounter.period) {
    encounter.period.end = data.dischargeDate;
  }

  if (data.specialtyCode || data.specialtyName) {
    encounter.serviceType = {
      coding: data.specialtyCode
        ? [
            {
              system: "https://his.example.com/specialty",
              code: data.specialtyCode,
              display: data.specialtyName,
            },
          ]
        : undefined,
      text: data.specialtyName,
    };
  }

  return encounter;
}

/**
 * Build a FHIR Bundle (collection) containing all ward resources
 * Used by $get-ward-patients custom operation
 */
export function buildWardBundle(
  wardId: string,
  wardName: string | undefined,
  siteName: string | undefined,
  patientsData: WardPatientData[],
  baseUrl?: string
): Bundle {
  const url = baseUrl ?? "";
  const entries: BundleEntry[] = [];
  const locationRef = `Location/${wardId}`;

  for (const data of patientsData) {
    const patient = mapPatient(data.patient);
    const patientRef = `Patient/${patient.id}`;

    const encounter = mapEncounter(data.inpatient, patientRef, locationRef);
    entries.push({
      fullUrl: `${url}/Encounter/${encounter.id}`,
      resource: encounter,
    });

    entries.push({
      fullUrl: `${url}/Patient/${patient.id}`,
      resource: patient,
    });
  }

  const location = mapLocation(wardId, wardName, siteName);
  entries.push({
    fullUrl: `${url}/Location/${wardId}`,
    resource: location,
  });

  return {
    resourceType: "Bundle",
    type: "collection",
    total: patientsData.length,
    entry: entries,
  };
}
