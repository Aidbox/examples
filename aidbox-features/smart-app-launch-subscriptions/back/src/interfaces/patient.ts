export interface Patient {
  multipleBirthBoolean: boolean;
  address: Address[];
  meta: Meta;
  name: Name[];
  birthDate: string;
  resourceType: string;
  extension: Extension[];
  communication: Communication[];
  id: string;
  identifier: Identifier[];
  telecom: Telecom[];
  generalPractitioner: GeneralPractitioner[];
  gender: string;
  maritalStatus: MaritalStatus;
  text: Text;
}

interface Address {
  city: string;
  line: string[];
  state: string;
  country: string;
  extension: Extension[];
  postalCode: string;
}

interface Extension {
  url: string;
  extension?: Extension[];
  valueDecimal?: number;
  valueCoding?: ValueCoding;
  valueString?: string;
  valueCode?: string;
  valueAddress?: ValueAddress;
}

interface ValueCoding {
  code: string;
  system: string;
  display: string;
}

interface ValueAddress {
  city: string;
  state: string;
  country: string;
}

interface Meta {
  profile: string[];
  lastUpdated: string;
  versionId: string;
  extension: Extension[];
}

interface Name {
  use: string;
  given: string[];
  family: string;
  prefix: string[];
}

interface Communication {
  language: Language;
}

interface Language {
  text: string;
  coding: ValueCoding[];
}

interface Identifier {
  value: string;
  system: string;
  type?: Type;
}

interface Type {
  text: string;
  coding: ValueCoding[];
}

interface Telecom {
  use: string;
  value: string;
  system: string;
}

interface GeneralPractitioner {
  reference: string;
}

interface MaritalStatus {
  text: string;
  coding: ValueCoding[];
}

interface Text {
  div: string;
  status: string;
}