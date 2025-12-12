import type { Encounter, EncounterParticipant } from './fhir-r4/fhir-types/hl7-fhir-r4-core/Encounter';
import type { AidboxClient } from './client';

// Helper functions for random data generation
function randomElement<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)]!;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(): boolean {
    return Math.random() < 0.5;
}

function randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
}

// Fetch a fixed pool of practitioners and patients from Aidbox
export async function fetchResourcePools(client: AidboxClient, practitionerPoolSize: number = 10): Promise<{
    practitionerIds: string[];
    patientIds: string[];
}> {
    const [practitionersBundle, patientsBundle] = await Promise.all([
        client.searchPractitioners({ _count: practitionerPoolSize, _elements: 'id' }),
        client.searchPatients({ _count: 20, _elements: 'id' })
    ]);

    const practitionerIds = practitionersBundle.entry?.map((x: any) => x.resource.id) || [];
    const patientIds = patientsBundle.entry?.map((x: any) => x.resource.id) || [];

    if (practitionerIds.length === 0) {
        throw new Error('No practitioners found in Aidbox');
    }
    if (patientIds.length === 0) {
        throw new Error('No patients found in Aidbox');
    }

    console.log(`Loaded ${practitionerIds.length} practitioners and ${patientIds.length} patients`);
    return { practitionerIds, patientIds };
}

// Helper function to create encounter with pre-loaded practitioners and patients
export async function createEncounterWithRealResources(
    client: AidboxClient,
    resourcePool: { practitionerIds: string[]; patientIds: string[] }
): Promise<Encounter> {
    const { practitionerIds, patientIds } = resourcePool;

    // Select random IDs from the pool
    const randomPractitionerId = randomElement(practitionerIds);
    const randomPatientId = randomElement(patientIds);

    // Generate encounter with random data
    const statuses: Encounter['status'][] = [
        'planned',
        'arrived',
        'triaged',
        'in-progress',
        'onleave',
        'finished',
        'cancelled',
        'entered-in-error',
        'unknown'
    ];

    const encounterClasses = [
        { code: 'AMB', display: 'ambulatory', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'EMER', display: 'emergency', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'IMP', display: 'inpatient encounter', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'ACUTE', display: 'inpatient acute', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'NONAC', display: 'inpatient non-acute', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'OBSENC', display: 'observation encounter', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'PRENC', display: 'pre-admission', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'SS', display: 'short stay', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
        { code: 'VR', display: 'virtual', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' }
    ];

    const now = new Date();
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const startDate = randomDate(pastDate, now);
    const start = new Date(startDate);
    const durationMinutes = randomInt(15, 480); // 15 minutes to 8 hours
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Create participant with practitioner
    const participant: EncounterParticipant = {
        individual: {
            reference: `Practitioner/${randomPractitionerId}` as `Practitioner/${string}`,
            display: 'Practitioner'
        }
    };

    // Add participant type if random
    if (randomBoolean()) {
        participant.type = [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: randomElement(['PPRF', 'ATND', 'CON', 'REF', 'SPRF']),
                display: randomElement(['Primary Performer', 'Attender', 'Consultant', 'Referrer', 'Secondary Performer'])
            }]
        }];
    }

    // Add period to participant if random
    if (randomBoolean()) {
        participant.period = {
            start: startDate,
            end: end.toISOString()
        };
    }

    const selectedClass = randomElement(encounterClasses);
    const encounter: Encounter = {
        status: randomElement(statuses),
        class: {
            system: selectedClass.system,
            code: selectedClass.code,
            display: selectedClass.display
        },
        subject: {
            reference: `Patient/${randomPatientId}` as `Patient/${string}`,
            display: 'Patient'
        },
        participant: [participant],
        period: {
            start: startDate,
            end: end.toISOString()
        }
    };

    // Add type field (always required)
    const encounterTypes = [
        { code: '270427003', display: 'Patient-initiated encounter' },
        { code: '308335008', display: 'Patient encounter procedure' },
        { code: '390906007', display: 'Follow-up encounter' },
        { code: '185349003', display: 'Encounter for check up' },
        { code: '185347001', display: 'Encounter for problem' }
    ];
    const selectedType = randomElement(encounterTypes);
    encounter.type = [{
        coding: [{
            system: 'http://snomed.info/sct',
            code: selectedType.code,
            display: selectedType.display
        }]
    }];

    // Add optional fields randomly

    if (randomBoolean()) {
        const serviceTypes = [
            { code: '1', display: 'General Practice' },
            { code: '2', display: 'Cardiology' },
            { code: '3', display: 'Allergy' },
            { code: '8', display: 'Physiotherapy' },
            { code: '17', display: 'Radiology' },
            { code: '57', display: 'Pathology' }
        ];
        const selectedService = randomElement(serviceTypes);
        encounter.serviceType = {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-type',
                code: selectedService.code,
                display: selectedService.display
            }]
        };
    }

    if (randomBoolean()) {
        encounter.priority = {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
                code: randomElement(['R', 'UR', 'EM', 'EL']),
                display: randomElement(['Routine', 'Urgent', 'Emergency', 'Elective'])
            }]
        };
    }

    if (randomBoolean()) {
        const reasonCodes = [
            { code: '1023001', display: 'Apnea' },
            { code: '11840006', display: 'Trauma' },
            { code: '386661006', display: 'Fever' },
            { code: '25064002', display: 'Headache' },
            { code: '21522001', display: 'Abdominal pain' }
        ];
        const selectedReason = randomElement(reasonCodes);
        encounter.reasonCode = [{
            coding: [{
                system: 'http://snomed.info/sct',
                code: selectedReason.code,
                display: selectedReason.display
            }],
            text: selectedReason.display
        }];
    }

    // Create the encounter in Aidbox
    const createdEncounter = await client.createResource<Encounter>('Encounter', encounter);

    return createdEncounter;
}

// Function to create N encounters with a fixed pool of practitioners
export async function createMultipleEncounters(
    client: AidboxClient,
    count: number,
    practitionerPoolSize: number = 10
): Promise<Encounter[]> {
    // Fetch resource pool once at the beginning
    const resourcePool = await fetchResourcePools(client, practitionerPoolSize);

    console.log(`Creating ${count} encounters with ${resourcePool.practitionerIds.length} practitioners...`);
    const encounters: Encounter[] = [];

    for (let i = 0; i < count; i++) {
        try {
            const encounter = await createEncounterWithRealResources(client, resourcePool);
            encounters.push(encounter);
            console.log(`Created encounter ${i + 1}/${count}: ${encounter.id}`);
        } catch (error) {
            console.error(`Failed to create encounter ${i + 1}/${count}:`, error);
        }
    }

    console.log(`Successfully created ${encounters.length} encounters`);
    return encounters;
}
