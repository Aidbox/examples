interface SubscriptionEvent {
    eventNumber: number;
    focus: { reference: string };
}

interface AidboxSubscriptionStatus {
    resourceType: 'AidboxSubscriptionStatus';
    status: string;
    type: string;
    notificationEvent: SubscriptionEvent[];
    topic: string;
    'topic-destination': { reference: string };
}

interface Request {
    method: string;
    url: string;
}

interface Meta {
    lastUpdated: string;
    versionId: string;
    extension: { url: string; valueInstant: string }[];
}

export interface Encounter {
    id: string;
    status: string;
    subject: { reference: string };
    resourceType: string;
    meta: Meta;
}

export interface EncounterDetailed {
    id: string;
    status: string;
    subject: { reference: string };
    resourceType: string;
    meta: Meta;
}

interface Entry {
    resource?: AidboxSubscriptionStatus | Encounter;
    request?: Request;
    fullUrl?: string;
}

export interface SubscriptionBundle {
    resourceType: 'Bundle';
    type: string;
    timestamp: string;
    entry: Entry[];
}