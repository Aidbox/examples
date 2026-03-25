/**
 * Shared test data for HIS server and event publisher
 * 7 sample patients in Ward 04 at General Hospital
 */

import type { CurrentInpatient, Patient } from "./types/his";
import type { ADTPatientData, ADTEncounterData } from "./types/events";

// ============ Ward ============

export const TEST_WARD_ID = "ward-001";
export const TEST_WARD_NAME = "Ward 04";
export const TEST_SITE_NAME = "General Hospital";

// ============ Patient Records ============

interface TestRecord {
  patient: ADTPatientData;
  encounter: Omit<ADTEncounterData, "wardId" | "wardName" | "siteName">;
}

export const TEST_PATIENTS: TestRecord[] = [
  {
    patient: {
      patientId: "patient-001",
      localId: "H100001",
      title: "Mr",
      forename: "James",
      surname: "Wilson",
      gender: "Male",
      birthDate: "1990-01-15",
    },
    encounter: {
      spellId: "spell-001",
      externalSpellId: "EXT001",
      bedName: "B05",
      admissionDate: "2024-12-01T15:52:00Z",
      specialtyCode: "100",
      specialtyName: "General Surgery",
      status: "arrived",
    },
  },
  {
    patient: {
      patientId: "patient-002",
      localId: "H100002",
      title: "Mrs",
      forename: "Sarah",
      surname: "Johnson",
      gender: "Female",
      birthDate: "1985-06-20",
    },
    encounter: {
      spellId: "spell-002",
      externalSpellId: "EXT002",
      bedName: "B03",
      admissionDate: "2024-12-02T09:00:00Z",
      specialtyCode: "100",
      specialtyName: "General Surgery",
      status: "arrived",
    },
  },
  {
    patient: {
      patientId: "patient-003",
      localId: "H100003",
      title: "Mr",
      forename: "Robert",
      surname: "Brown",
      gender: "Male",
      birthDate: "1972-03-10",
    },
    encounter: {
      spellId: "spell-003",
      externalSpellId: "EXT003",
      bedName: "B02",
      admissionDate: "2024-12-03T11:44:00Z",
      specialtyCode: "300",
      specialtyName: "General Medicine",
      status: "in-progress",
    },
  },
  {
    patient: {
      patientId: "patient-004",
      localId: "H100004",
      title: "Ms",
      forename: "Emily",
      surname: "Davis",
      gender: "Female",
      birthDate: "1957-03-02",
    },
    encounter: {
      spellId: "spell-004",
      externalSpellId: "EXT004",
      admissionDate: "2024-12-14T11:00:00Z",
      specialtyCode: "120",
      specialtyName: "ENT",
      status: "arrived",
    },
  },
  {
    patient: {
      patientId: "patient-005",
      nationalId: "NAT-9000001",
      localId: "H100005",
      title: "Mr",
      forename: "Michael",
      surname: "Taylor",
      gender: "Male",
      birthDate: "1965-10-10",
    },
    encounter: {
      spellId: "spell-005",
      externalSpellId: "EXT005",
      bedName: "B01",
      admissionDate: "2024-12-20T09:00:00Z",
      specialtyCode: "101",
      specialtyName: "Urology",
      status: "arrived",
    },
  },
  {
    patient: {
      patientId: "patient-006",
      nationalId: "NAT-9000002",
      localId: "H100006",
      title: "Miss",
      forename: "Anna",
      otherGivenNames: "Marie",
      surname: "Martinez",
      gender: "Female",
      birthDate: "1998-02-28",
    },
    encounter: {
      spellId: "spell-006",
      externalSpellId: "EXT006",
      admissionDate: "2024-12-22T15:35:00Z",
      specialtyCode: "100",
      specialtyName: "General Surgery",
      status: "arrived",
    },
  },
  {
    patient: {
      patientId: "patient-007",
      nationalId: "NAT-9000003",
      localId: "H100007",
      title: "Mrs",
      forename: "Patricia",
      surname: "Garcia",
      gender: "Female",
      birthDate: "1992-04-06",
    },
    encounter: {
      spellId: "spell-007",
      externalSpellId: "EXT007",
      admissionDate: "2025-01-11T11:58:00Z",
      specialtyCode: "100",
      specialtyName: "General Surgery",
      status: "arrived",
    },
  },
];

// ============ HIS API Format Converters ============

/**
 * Convert test record to HIS CurrentInpatient format
 */
export function toCurrentInpatient(record: TestRecord): CurrentInpatient {
  return {
    spellId: record.encounter.spellId,
    patientId: record.patient.patientId,
    externalSpellId: record.encounter.externalSpellId,
    admissionDate: record.encounter.admissionDate,
    status: record.encounter.status,
    currentLocation: {
      wardId: TEST_WARD_ID,
      wardName: TEST_WARD_NAME,
      siteName: TEST_SITE_NAME,
      bedName: record.encounter.bedName,
    },
    currentInpatientEpisode: {
      currentSpecialty: {
        specialtyCode: record.encounter.specialtyCode,
        specialtyName: record.encounter.specialtyName,
      },
    },
    patient: {
      patientName: `${record.patient.forename} ${record.patient.surname}`,
      localNumber: record.patient.localId,
      dateOfBirth: record.patient.birthDate,
      patientGender: record.patient.gender,
    },
  };
}

/**
 * Convert test record to HIS Patient format
 */
export function toHISPatient(record: TestRecord): Patient {
  return {
    patientId: record.patient.patientId,
    title: record.patient.title
      ? { id: record.patient.title.toLowerCase(), description: record.patient.title }
      : undefined,
    gender: { id: record.patient.gender.toLowerCase(), description: record.patient.gender },
    doB: record.patient.birthDate,
    forename: record.patient.forename,
    surname: record.patient.surname,
    otherGivenNames: record.patient.otherGivenNames,
    localIdentifier: record.patient.localId
      ? { value: record.patient.localId }
      : undefined,
    nationalIdentifier: record.patient.nationalId
      ? { value: record.patient.nationalId }
      : undefined,
  };
}
