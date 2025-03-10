interface Meta {
    versionId: string;
    lastUpdated?: string;
    extension?: Extension[];
    profile?: string[];
}

interface Extension {
    url: string;
    valueInstant?: string;
    valueDecimal?: number;
    valueString?: string;
    valueCode?: string;
    valueAddress?: Address;
    extension?: Extension[];
}

interface Address {
    city: string;
    line?: string[];
    state: string;
    country: string;
    postalCode?: string;
    extension?: Extension[];
}

interface Link {
    relation: string;
    url: string;
}

interface Coding {
    code: string;
    system: string;
    display: string;
}

interface Code {
    coding: Coding[];
}

interface Condition {
    reference: string;
}

interface Diagnosis {
    condition: Condition;
}

interface Class {
    code: string;
    system: string;
    display: string;
}

interface Resource {
    resourceType: string;
    id: string;
    meta: Meta;
    class?: Class;
    status?: string;
    subject?: Condition;
    diagnosis?: Diagnosis[];
    multipleBirthBoolean?: boolean;
    address?: Address[];
    managingOrganization?: Condition;
    name?: Name[];
    birthDate?: string;
    extension?: Extension[];
    communication?: Communication[];
    identifier?: Identifier[];
    telecom?: Telecom[];
    generalPractitioner?: Condition[];
    gender?: string;
    maritalStatus?: Code;
    text?: Text;
    code?: Code;
    clinicalStatus?: Code;
}

interface Name {
    use: string;
    given: string[];
    family: string;
    prefix: string[];
}

interface Communication {
    language: Code;
}

interface Identifier {
    value: string;
    system: string;
    type?: Code;
}

interface Telecom {
    use: string;
    value: string;
    system: string;
}

interface Text {
    div: string;
    status: string;
}

interface Entry {
    resource: Resource;
    search: Search;
    fullUrl: string;
    link: Link[];
}

interface Search {
    mode: string;
}

export interface Bundle {
    resourceType: string;
    type: string;
    meta: Meta;
    total: number;
    link: Link[];
    entry: Entry[];
}

export interface Notification {
    type: string;
    recipient: string;
    date: string;
    bundle: Bundle;
}
