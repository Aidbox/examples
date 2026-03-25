/**
 * ADT Event Types (Fat Events)
 * Admit/Discharge/Transfer events from HIS with full patient/encounter data
 */

export type ADTAction = "admit" | "discharge" | "transfer";

export interface ADTPatientData {
  patientId: string;
  nationalId?: string;
  localId?: string;
  title?: string;
  forename: string;
  surname: string;
  otherGivenNames?: string;
  preferredName?: string;
  gender: string;
  birthDate: string;
  deceasedDateTime?: string;
}

export interface ADTEncounterData {
  spellId: string;
  externalSpellId?: string;
  wardId: string;
  wardName: string;
  siteName?: string;
  bedName?: string;
  admissionDate: string;
  dischargeDate?: string;
  specialtyCode?: string;
  specialtyName?: string;
  status?: "planned" | "arrived" | "triaged" | "in-progress" | "onleave" | "finished" | "cancelled";
}

export interface ADTEvent {
  eventType: "ADT";
  action: ADTAction;
  timestamp: string;
  patient: ADTPatientData;
  encounter: ADTEncounterData;
}

export interface EventEnvelope {
  id: string;
  source: string;
  timestamp: string;
  payload: ADTEvent;
}
