// todo - make shared between front and back

interface Meta {
  versionId: string
  lastUpdated?: string
  extension?: Extension[]
  profile?: string[]
}

interface Extension {
  url: string
  valueInstant?: string
  valueDecimal?: number
  valueString?: string
  valueCode?: string
  valueAddress?: Address
  extension?: Extension[]
}

interface Address {
  city: string
  line?: string[]
  state: string
  country: string
  postalCode?: string
  extension?: Extension[]
}

interface Link {
  relation: string
  url: string
}

interface Coding {
  code: string
  system: string
  display: string
}

interface Code {
  coding: Coding[]
}

interface Condition {
  reference: string
}

interface Organization {
  display: string
  reference: string
}

interface Diagnosis {
  condition: Condition
}

interface EncounterClass {
  code: string
  system: string
  display: string
}

export interface EncounterResource {
  resourceType: 'Encounter'
  id: string
  meta: Meta
  class?: EncounterClass
  status?: string
  subject?: Condition
  diagnosis?: Diagnosis[]
  generalPractitioner?: Condition[]
}

export interface PatientResource {
  resourceType: 'Patient'
  id: string
  meta: Meta
  multipleBirthBoolean?: boolean
  address?: Address[]
  managingOrganization?: Organization
  name?: PatientName[]
  birthDate?: string
  extension?: Extension[]
  communication?: Communication[]
  identifier?: Identifier[]
  telecom?: Telecom[]
  generalPractitioner?: Condition[]
  gender?: string
  maritalStatus?: Code
  text?: Text
}

export interface OrganizationResource {
  resourceType: 'Organization'
  id: string
  name?: string
}

export interface ConditionResource {
  resourceType: 'Condition'
  id: string
  meta: Meta
  code?: Code
  subject?: Condition
  clinicalStatus?: Code
}

type Resource = EncounterResource | PatientResource | OrganizationResource | ConditionResource

interface PatientName {
  use: string
  given: string[]
  family: string
  prefix: string[]
}

interface Communication {
  language: Code
}

interface Identifier {
  value: string
  system: string
  type?: Code
}

interface Telecom {
  use: string
  value: string
  system: string
}

interface Text {
  div: string
  status: string
}

interface Entry {
  resource: Resource
  search: Search
  fullUrl: string
  link: Link[]
}

interface Search {
  mode: string
}

export interface CreateEncounterBundle {
  resourceType: string
  type: string
  meta: Meta
  total: number
  link: Link[]
  entry: Entry[]
}

export interface EhrEventBase {
  recipient: string
  date: string
}

export interface EhrEventCreateEncounter extends EhrEventBase {
  type: 'encounter_created'
  bundle: CreateEncounterBundle
}

export interface EhrEventTest extends EhrEventBase {
  type: 'test'
  bundle: {
    testParam: string
  }
}

export type EhrEvent = EhrEventCreateEncounter | EhrEventTest
