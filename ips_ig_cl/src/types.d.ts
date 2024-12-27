import { Client as AidboxClient } from "@aidbox/sdk-r4";
import { AllergyIntolerance } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/AllergyIntolerance";
import { CarePlan } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/CarePlan";
import { Condition } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Condition";
import { Consent } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Consent";
import { DeviceUseStatement } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/DeviceUseStatement";
import { DiagnosticReport } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/DiagnosticReport";
import { Flag } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Flag";
import { Immunization } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Immunization";
import { Medication } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Medication";
import { MedicationRequest } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/MedicationRequest";
import { MedicationStatement } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/MedicationStatement";
import { Observation } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Observation";
import { Procedure } from "@aidbox/sdk-r4/types/hl7-fhir-r4-core/Procedure";
import { FastifyReply, FastifyRequest } from "fastify";
type BasicAuthorization = {
  method: "basic";
  credentials: {
    username: string;
    password: string;
  };
};

export type Client = AidboxClient<BasicAuthorization>;

export type HttpClient = ReturnType<Client["HTTPClient"]>;

export type Request = FastifyRequest<{
  Params: { id: string };
  Body: {
    type: string;
    operation: {
      id: string;
    };
    request: {
      params: Record<string, string>;
      "route-params": Record<string, any>;
      headers: Record<string, any>;
      "oauth/user": Record<string, any>;
    };
  };
}>;

export interface Config {
  app: {
    port: number;
    baseUrl: string;
    callbackUrl: string;
    secret: string;
    id: string;
  };
  aidbox: {
    url: string;
    client: {
      id: string;
      secret: string;
    };
  };
}

export type AppResourceOperation = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: (string | { name: string })[];
};

export type Operations = Record<string, Operation>;

export type Operation<T extends Request = any, U = any> = AppResourceOperation & {
  handlerFn: (request: Request, reply: FastifyReply) => Promise<any>;
};

export type PatientData = Array<{
  resource:
    | Condition
    | AllergyIntolerance
    | Medication
    | MedicationRequest
    | MedicationStatement
    | Immunization
    | Procedure
    | DeviceUseStatement
    | DiagnosticReport
    | Observation
    | CarePlan
    | Consent
    | Flag
    ;
}>;

export type SimpleNarrativeEntry = Array<{
  resource: Condition | AllergyIntolerance | Medication | Immunization | Observation;
}>;

export type SectionName =
  | "ProblemList"
  | "IllnessHistory"
  | "AllergyIntolerance"
  | "MedicationSummary"
  | "Immunizations"
  | "Procedures"
  | "MedicalDevices"
  | "DiagnosticResults"
  | "VitalSigns"
  | "Pregnancy"
  | "SocialHistory"
  | "StatusFunctional"
  | "CarePlan"
  | "Alerts"
  | "AdvancedDirectives";

export type IpsProfile =
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/RegMedicamentos-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/MedicationRequest-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/AllergiaInt-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Procedimientos-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Inmunizacion-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Declaracion-uso-dispositivo-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/DiagnosticReport-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-laboratorio-patologico-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-radiology-cl-ips"
  |  "http://hl7.org/fhir/StructureDefinition/vitalsigns"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Condition-cl-ips"
  |  "http://hl7.org/fhir/StructureDefinition/ClinicalImpression"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-estado-del-embarazo-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-resultado-del-embarazo-cl-ips"
  |  "http://hl7.org/fhir/StructureDefinition/CarePlan"  
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-uso-de-tabaco-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Observation-uso-de-alcohol-cl-ips"
  |  "https://hl7chile.cl/fhir/ig/clips/StructureDefinition/Flag-alerta-cl-ips"
  |  "http://hl7.org/fhir/StructureDefinition/Consent";

export type SectionToGenerateFuncMap = {
  [K in SectionName]?: any;
};

export type BundleEntry = Array<{
  request: {
    method: string;
    url: string;
  };
}>;

export type SectionProfiles = {
  [K in SectionName]: Record<string, Array<string>>;
};

export type SectionProfilesSearches = {
  [k in IpsProfile]: string | null;
};
