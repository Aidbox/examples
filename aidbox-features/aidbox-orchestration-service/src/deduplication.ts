/**
 * Deduplication logic for FHIR resources using UK Core profiles
 * - Patient: merge by NHS Number
 * - AllergyIntolerance: deduplicate by code using ConceptMap/$translate
 * - Observation: deduplicate by code + datetime + value
 * - Encounter: no deduplication (keep all)
 */

import type {
  Patient,
  AllergyIntolerance,
  Observation,
  Encounter,
  Coding,
  ParametersParameter,
} from "./fhir-types/hl7-fhir-r4-core";
import {
  UKCorePatientProfile,
  UKCoreAllergyIntoleranceProfile,
} from "./fhir-types/fhir-r4-ukcore-stu2/profiles";
import type { AuthProvider } from "./fhir-clients";

const NHS_NUMBER_SYSTEM = "https://fhir.nhs.uk/Id/nhs-number";

// UK Core profile URLs
const UK_CORE_PATIENT_PROFILE = "https://fhir.hl7.org.uk/StructureDefinition/UKCore-Patient";
const UK_CORE_ALLERGY_PROFILE = "https://fhir.hl7.org.uk/StructureDefinition/UKCore-AllergyIntolerance";
const UK_CORE_OBSERVATION_PROFILE = "https://fhir.hl7.org.uk/StructureDefinition/UKCore-Observation";
const UK_CORE_ENCOUNTER_PROFILE = "https://fhir.hl7.org.uk/StructureDefinition/UKCore-Encounter";

// ============ Helper: Ensure UK Core Profile ============

function ensureProfile<T extends { meta?: { profile?: string[] } }>(
  resource: T,
  profileUrl: string
): T {
  const meta = resource.meta ?? {};
  const profiles = meta.profile ?? [];
  if (!profiles.includes(profileUrl)) {
    profiles.push(profileUrl);
  }
  return {
    ...resource,
    meta: { ...meta, profile: profiles },
  };
}

// ============ Patient Deduplication ============

export function getNhsNumber(patient: Patient): string | undefined {
  const profile = new UKCorePatientProfile(patient);
  return profile.getNhsNumber()?.value;
}

export function mergePatients(patients: Patient[]): Patient | null {
  if (patients.length === 0) return null;
  if (patients.length === 1) {
    return ensureProfile(patients[0]!, UK_CORE_PATIENT_PROFILE);
  }

  // Take first patient as base, merge additional info from others
  const merged = { ...patients[0]! };

  for (let i = 1; i < patients.length; i++) {
    const other = patients[i]!;

    // Merge names - keep the one with more given names
    if (other.name && other.name.length > 0) {
      const otherName = other.name[0]!;
      const currentName = merged.name?.[0];

      if (!currentName) {
        merged.name = other.name;
      } else {
        const otherGivenCount = otherName.given?.length ?? 0;
        const currentGivenCount = currentName.given?.length ?? 0;
        if (otherGivenCount > currentGivenCount) {
          merged.name = other.name;
        }
      }
    }

    // Merge telecom if not present
    if (!merged.telecom && other.telecom) {
      merged.telecom = other.telecom;
    }

    // Merge address if not present
    if (!merged.address && other.address) {
      merged.address = other.address;
    }
  }

  // Generate new ID for merged patient
  const nhsNumber = getNhsNumber(merged);
  merged.id = `merged-${nhsNumber ?? "unknown"}`;

  // Ensure UK Core profile
  return ensureProfile(merged, UK_CORE_PATIENT_PROFILE);
}

// ============ AllergyIntolerance Deduplication ============

interface TranslateResult {
  resourceType: "Parameters";
  parameter?: ParametersParameter[];
}

export async function translateCode(
  mainFhirAuth: AuthProvider,
  sourceSystem: string,
  code: string,
  _targetSystem: string
): Promise<string | null> {
  const url = new URL(`${mainFhirAuth.baseUrl}/fhir/ConceptMap/allergy-loinc-to-snomed/$translate`);
  url.searchParams.set("system", sourceSystem);
  url.searchParams.set("code", code);

  try {
    const response = await mainFhirAuth.fetch(url.toString());
    if (!response.ok) return null;

    const result = (await response.json()) as TranslateResult;
    const matchParam = result.parameter?.find(p => p.name === "match");
    const conceptParam = matchParam?.part?.find(p => p.name === "concept");
    return conceptParam?.valueCoding?.code ?? null;
  } catch {
    return null;
  }
}

function getAllergyCodes(allergy: AllergyIntolerance): Coding[] {
  const profile = new UKCoreAllergyIntoleranceProfile(allergy);
  const resource = profile.toResource();
  return resource.code?.coding ?? [];
}

/**
 * Get verificationStatus priority for canonical selection.
 * Higher priority = better candidate for canonical.
 */
function getVerificationStatusPriority(allergy: AllergyIntolerance): number {
  const status = allergy.verificationStatus?.coding?.[0]?.code;
  switch (status) {
    case "confirmed": return 4;
    case "unconfirmed": return 3;
    case "refuted": return 2;
    case "entered-in-error": return 1;
    default: return 0;
  }
}

function sortAllergiesByPriority(allergies: AllergyIntolerance[]): AllergyIntolerance[] {
  return [...allergies].sort(
    (a, b) => getVerificationStatusPriority(b) - getVerificationStatusPriority(a)
  );
}

export interface AllergyDeduplicationResult {
  allergies: AllergyIntolerance[];
  deduplicationGroups: AllergyIntolerance[][];
}

export async function deduplicateAllergies(
  allergies: AllergyIntolerance[],
  mainFhirAuth: AuthProvider
): Promise<AllergyDeduplicationResult> {
  if (allergies.length === 0) {
    return { allergies: [], deduplicationGroups: [] };
  }
  if (allergies.length === 1) {
    const withProfile = ensureProfile(allergies[0]!, UK_CORE_ALLERGY_PROFILE) as AllergyIntolerance;
    return { allergies: [withProfile], deduplicationGroups: [[allergies[0]!]] };
  }

  const sorted = sortAllergiesByPriority(allergies);
  const result: AllergyIntolerance[] = [];
  const deduplicationGroups: AllergyIntolerance[][] = [];
  const processedCodes = new Map<string, number>();

  for (const allergy of sorted) {
    const codes = getAllergyCodes(allergy);
    let matchedGroupIndex: number | null = null;

    for (const coding of codes) {
      const codeKey = `${coding.system}|${coding.code}`;

      if (processedCodes.has(codeKey)) {
        matchedGroupIndex = processedCodes.get(codeKey)!;
        break;
      }

      if (coding.system === "http://loinc.org" && coding.code) {
        const translatedCode = await translateCode(
          mainFhirAuth,
          coding.system,
          coding.code,
          "http://snomed.info/sct"
        );

        if (translatedCode) {
          const translatedKey = `http://snomed.info/sct|${translatedCode}`;
          if (processedCodes.has(translatedKey)) {
            matchedGroupIndex = processedCodes.get(translatedKey)!;
            break;
          }
        }
      }
    }

    if (matchedGroupIndex !== null) {
      deduplicationGroups[matchedGroupIndex]!.push(allergy);
    } else {
      const groupIndex = deduplicationGroups.length;
      const withProfile = ensureProfile(allergy, UK_CORE_ALLERGY_PROFILE) as AllergyIntolerance;
      result.push(withProfile);
      deduplicationGroups.push([allergy]);

      for (const coding of codes) {
        const codeKey = `${coding.system}|${coding.code}`;
        processedCodes.set(codeKey, groupIndex);

        if (coding.system === "http://loinc.org" && coding.code) {
          const translatedCode = await translateCode(
            mainFhirAuth,
            coding.system,
            coding.code,
            "http://snomed.info/sct"
          );
          if (translatedCode) {
            processedCodes.set(`http://snomed.info/sct|${translatedCode}`, groupIndex);
          }
        }
      }
    }
  }

  return { allergies: result, deduplicationGroups };
}

export function deduplicateAllergiesByExactCode(
  allergies: AllergyIntolerance[]
): AllergyIntolerance[] {
  const seen = new Set<string>();
  const result: AllergyIntolerance[] = [];

  for (const allergy of allergies) {
    const codes = getAllergyCodes(allergy);
    const codeKeys = codes.map(c => `${c.system}|${c.code}`);
    const isDuplicate = codeKeys.some(key => seen.has(key));

    if (!isDuplicate) {
      codeKeys.forEach(key => seen.add(key));
      const withProfile = ensureProfile(allergy, UK_CORE_ALLERGY_PROFILE) as AllergyIntolerance;
      result.push(withProfile);
    }
  }

  return result;
}

// ============ Observation Deduplication ============

function getObservationCode(obs: Observation): Coding | null {
  return obs.code?.coding?.[0] ?? null;
}

function getObservationDateTime(obs: Observation): Date | null {
  if (obs.effectiveDateTime) {
    return new Date(obs.effectiveDateTime);
  }
  return null;
}

function getObservationValue(obs: Observation): number | null {
  if (obs.valueQuantity?.value !== undefined) {
    return obs.valueQuantity.value;
  }
  return null;
}

function datesWithinTolerance(date1: Date | null, date2: Date | null, toleranceMs: number): boolean {
  if (!date1 || !date2) return false;
  return Math.abs(date1.getTime() - date2.getTime()) <= toleranceMs;
}

function observationsMatch(obs1: Observation, obs2: Observation): boolean {
  const code1 = getObservationCode(obs1);
  const code2 = getObservationCode(obs2);

  if (!code1 || !code2) return false;
  if (code1.system !== code2.system || code1.code !== code2.code) return false;

  const date1 = getObservationDateTime(obs1);
  const date2 = getObservationDateTime(obs2);
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (!datesWithinTolerance(date1, date2, ONE_HOUR_MS)) return false;

  const value1 = getObservationValue(obs1);
  const value2 = getObservationValue(obs2);
  if (value1 !== null && value2 !== null && value1 !== value2) {
    return false;
  }

  return true;
}

function getObservationPriority(obs: Observation): number {
  let priority = 0;
  if (obs.interpretation && obs.interpretation.length > 0) priority += 2;
  if (obs.referenceRange && obs.referenceRange.length > 0) priority += 1;
  return priority;
}

export interface ObservationDeduplicationResult {
  observations: Observation[];
  deduplicationGroups: Observation[][];
}

export function deduplicateObservations(observations: Observation[]): ObservationDeduplicationResult {
  if (observations.length === 0) {
    return { observations: [], deduplicationGroups: [] };
  }
  if (observations.length === 1) {
    const withProfile = ensureProfile(observations[0]!, UK_CORE_OBSERVATION_PROFILE);
    return { observations: [withProfile], deduplicationGroups: [[observations[0]!]] };
  }

  const sorted = [...observations].sort(
    (a, b) => getObservationPriority(b) - getObservationPriority(a)
  );

  const result: Observation[] = [];
  const deduplicationGroups: Observation[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (processed.has(i)) continue;

    const obs = sorted[i]!;
    const group: Observation[] = [obs];
    processed.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (processed.has(j)) continue;

      if (observationsMatch(obs, sorted[j]!)) {
        group.push(sorted[j]!);
        processed.add(j);
      }
    }

    const withProfile = ensureProfile(obs, UK_CORE_OBSERVATION_PROFILE);
    result.push(withProfile);
    deduplicationGroups.push(group);
  }

  return { observations: result, deduplicationGroups };
}

// ============ Encounter - No Deduplication ============

export function collectEncounters(encounterLists: Encounter[][]): Encounter[] {
  return encounterLists.flat().map(enc => ensureProfile(enc, UK_CORE_ENCOUNTER_PROFILE));
}

// ============ Main Deduplication Function ============

export interface DeduplicationInput {
  patients: Patient[];
  allergies: AllergyIntolerance[];
  observations: Observation[];
  encounters: Encounter[];
}

export interface DeduplicationResult {
  patient: Patient | null;
  allergies: AllergyIntolerance[];
  observations: Observation[];
  encounters: Encounter[];
  allergyDeduplicationGroups: AllergyIntolerance[][];
  observationDeduplicationGroups: Observation[][];
}

// ============ Reference Update ============

function updatePatientReferences<T extends { patient?: { reference?: string }; subject?: { reference?: string } }>(
  resources: T[],
  oldPatientIds: string[],
  newPatientId: string
): T[] {
  const oldRefs = new Set(oldPatientIds.map(id => `Patient/${id}`));
  const newRef = `Patient/${newPatientId}`;

  return resources.map(resource => {
    const updated = { ...resource };

    if (updated.patient?.reference && oldRefs.has(updated.patient.reference)) {
      updated.patient = { ...updated.patient, reference: newRef };
    }

    if (updated.subject?.reference && oldRefs.has(updated.subject.reference)) {
      updated.subject = { ...updated.subject, reference: newRef };
    }

    return updated;
  });
}

export async function deduplicateResources(
  input: DeduplicationInput,
  mainFhirAuth: AuthProvider
): Promise<DeduplicationResult> {
  const patient = mergePatients(input.patients);

  const oldPatientIds = input.patients
    .map(p => p.id)
    .filter((id): id is string => id !== undefined);

  let allergyResult: AllergyDeduplicationResult;
  try {
    allergyResult = await deduplicateAllergies(input.allergies, mainFhirAuth);
  } catch (error) {
    console.warn("ConceptMap translation failed, using exact code match:", error);
    const exactMatch = deduplicateAllergiesByExactCode(input.allergies);
    allergyResult = {
      allergies: exactMatch,
      deduplicationGroups: exactMatch.map((a) => [a]),
    };
  }

  const observationResult = deduplicateObservations(input.observations);
  const encounters = collectEncounters([input.encounters]);

  const mergedPatientId = patient?.id;
  let allergies = allergyResult.allergies;
  let observations = observationResult.observations;
  let updatedEncounters = encounters;

  if (mergedPatientId && oldPatientIds.length > 0) {
    allergies = updatePatientReferences(allergies, oldPatientIds, mergedPatientId) as AllergyIntolerance[];
    observations = updatePatientReferences(observations, oldPatientIds, mergedPatientId);
    updatedEncounters = updatePatientReferences(encounters, oldPatientIds, mergedPatientId);
  }

  return {
    patient,
    allergies,
    observations,
    encounters: updatedEncounters,
    allergyDeduplicationGroups: allergyResult.deduplicationGroups,
    observationDeduplicationGroups: observationResult.deduplicationGroups,
  };
}
