/**
 * HIS (Hospital Information System) API Response Types
 * Generic types representing a proprietary hospital system API
 */

// ============ OAuth Token Response ============

export interface HISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============ Common Types ============

export interface LookupItem {
  id: string;
  description?: string;
}

export interface NumberIdentifier {
  value?: string;
  numberType?: LookupItem;
}

// ============ Inpatient API ============

export interface InpatientLocation {
  siteId?: string;
  siteName?: string;
  wardId?: string;
  wardName?: string;
  bayId?: string;
  bayName?: string;
  bedId?: string;
  bedName?: string;
}

export interface HealthcareProfessional {
  hcpId?: string;
  hcpName?: string;
}

export interface Specialty {
  specialtyId?: string;
  specialtyName?: string;
  specialtyCode?: string;
}

export interface InpatientEpisode {
  episodeId?: string;
  patientId?: string;
  currentHealthcareProfessional?: HealthcareProfessional;
  currentSpecialty?: Specialty;
}

export interface InpatientPatientSummary {
  patientName?: string;
  localNumber?: string;
  nationalNumber?: string;
  dateOfBirth?: string;
  patientGender?: string;
}

export interface CurrentInpatient {
  spellId: string;
  patientId: string;
  externalSpellId?: string;
  admissionDate?: string;
  currentInpatientEpisode?: InpatientEpisode;
  currentLocation?: InpatientLocation;
  patient?: InpatientPatientSummary;
  status?: string;
}

export interface PaginationList<T> {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  results: T[];
}

export type CurrentInpatientResponse = PaginationList<CurrentInpatient>;

// ============ Patient API ============

export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: LookupItem;
}

export interface Patient {
  patientId: string;
  title?: LookupItem;
  gender?: LookupItem;
  doB?: string;
  doD?: string;
  forename?: string;
  surname?: string;
  otherGivenNames?: string;
  preferredName?: string;
  localIdentifier?: NumberIdentifier;
  nationalIdentifier?: NumberIdentifier;
  currentAddress?: Address;
}

// ============ Combined Ward Data ============

export interface WardPatientData {
  inpatient: CurrentInpatient;
  patient: Patient;
}
