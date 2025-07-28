// Re-export all FHIR types
export * from './hl7-fhir-r4-core'

// Export auth-specific types
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthSession
} from './auth'

// Export Aidbox-specific types
export type {
  AidboxUser,
  AidboxClient,
  AidboxAccessPolicy,
  AidboxTokenIntrospector,
  PatientFormData
} from './aidbox'

export interface SearchParams {
  'placeholder-1': object;
  'placeholder-2': object;
  Bundle: object;
  Patient: object;
  Organization: object;
  Practitioner: object;
  PractitionerRole: object;
  User: { email?: string };
}

export interface SubsSubscription {
  status: 'active' | 'off';
  trigger: { event: Array<'all' | 'create' | 'update' | 'delete'>; filter?: unknown };
  channel: { type: 'rest-hook' };
}

export interface ResourceTypeMap {
  'placeholder-1': object;
  'placeholder-2': object;
  Bundle: { entry?: [] };
  Patient: object;
  Organization: import('./hl7-fhir-r4-core').Organization;
  Practitioner: import('./hl7-fhir-r4-core').Practitioner;
  PractitionerRole: import('./hl7-fhir-r4-core').PractitionerRole;
  User: import('./aidbox').AidboxUser;
}

export type TaskDefinitionsMap = {
  'placeholder-1': { params: object; result: object };
  'placeholder-2': { params: object; result: object };
};

export type WorkflowDefinitionsMap = {
  'placeholder-1': { params: object; result: object };
  'placeholder-2': { params: object; result: object };
};

export const TaskDefinitionsNameMap: Record<keyof TaskDefinitionsMap, string> = {
  'placeholder-1': 'my-workflows/placeholder-1',
  'placeholder-2': 'my-workflows/placeholder-2',
};

export const WorkflowDefinitionsNameMap: Record<keyof WorkflowDefinitionsMap, string> = {
  'placeholder-1': 'my-workflows/placeholder-1',
  'placeholder-2': 'my-workflows/placeholder-2',
};
