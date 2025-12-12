import type { Appointment, AppointmentParticipant } from './fhir-r4/fhir-types/hl7-fhir-r4-core/Appointment';
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

function generateRandomParticipant(): AppointmentParticipant {
    const statuses: AppointmentParticipant['status'][] = ['accepted', 'declined', 'tentative', 'needs-action'];
    const required: AppointmentParticipant['required'][] = ['required', 'optional', 'information-only'];
    const actorTypes = ['Patient', 'Practitioner', 'PractitionerRole', 'Location', 'Device'];

    const selectedType = randomElement(actorTypes);
    const reference = `${selectedType}/${randomInt(1, 1000)}` as `Patient/${string}` | `Practitioner/${string}` | `PractitionerRole/${string}` | `Location/${string}` | `Device/${string}`;

    return {
        status: randomElement(statuses),
        required: randomBoolean() ? randomElement(required) : undefined,
        actor: {
            reference,
            display: randomBoolean() ? `Random ${selectedType}` : undefined
        }
    };
}

export function generateRandomAppointment(): Appointment {
    const statuses: Appointment['status'][] = [
        'proposed', 'pending', 'booked', 'arrived',
        'fulfilled', 'cancelled', 'noshow', 'entered-in-error',
        'checked-in', 'waitlist'
    ];

    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    const startDate = randomDate(now, futureDate);
    const start = new Date(startDate);
    const minutesDuration = randomInt(15, 120);
    const end = new Date(start.getTime() + minutesDuration * 60 * 1000);

    const participantCount = randomInt(1, 4);
    const participants: AppointmentParticipant[] = [];
    for (let i = 0; i < participantCount; i++) {
        participants.push(generateRandomParticipant());
    }

    const appointment: Appointment = {
        status: randomElement(statuses),
        participant: participants,
        start: startDate,
        end: end.toISOString(),
        minutesDuration,
        created: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
    };

    // Add optional fields randomly
    if (randomBoolean()) {
        appointment.description = `Appointment for ${randomElement(['consultation', 'follow-up', 'checkup', 'procedure', 'therapy'])}`;
    }

    if (randomBoolean()) {
        appointment.comment = `${randomElement(['Patient requested', 'Urgent', 'Regular', 'Annual'])} appointment`;
    }

    if (randomBoolean()) {
        appointment.priority = randomInt(0, 9);
    }

    if (randomBoolean()) {
        appointment.appointmentType = {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
                code: randomElement(['ROUTINE', 'WALKIN', 'CHECKUP', 'FOLLOWUP', 'EMERGENCY']),
                display: randomElement(['Routine', 'Walk-in', 'Checkup', 'Follow-up', 'Emergency'])
            }]
        };
    }

    if (randomBoolean()) {
        appointment.serviceCategory = [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-category',
                code: randomElement(['1', '2', '3', '8', '17']),
                display: randomElement(['General Practice', 'Cardiology', 'Dental', 'Physiotherapy', 'Radiology'])
            }]
        }];
    }

    if (randomBoolean()) {
        appointment.patientInstruction = 'Please arrive 15 minutes early for registration.';
    }

    return appointment;
}

// Helper function to create appointment with real patient and practitioner from Aidbox
export async function createAppointmentWithRealResources(client: AidboxClient): Promise<Appointment> {
    const [practitionersBundle, patientsBundle] = await Promise.all([
        client.searchPractitioners({ _count: 100, _elements: 'id' }),
        client.searchPatients({ _count: 100, _elements: 'id' })
    ]);

    const practitionerIds = practitionersBundle.entry?.map((x: any) => x.resource.id) || [];
    const patientIds = patientsBundle.entry?.map((x: any) => x.resource.id) || [];

    if (practitionerIds.length === 0) {
        throw new Error('No practitioners found in Aidbox');
    }
    if (patientIds.length === 0) {
        throw new Error('No patients found in Aidbox');
    }

    // Select random IDs
    const randomPractitionerId = randomElement(practitionerIds);
    const randomPatientId = randomElement(patientIds);

    // Generate appointment with random data
    const statuses: Appointment['status'][] = [
        // 'proposed',
        // 'pending',
        // 'booked',
        'arrived',
        // 'fulfilled',
        'cancelled',
        // 'noshow',
        // 'entered-in-error',
        // 'checked-in',
        // 'waitlist'
    ];

    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const startDate = randomDate(now, futureDate);
    const start = new Date(startDate);
    const minutesDuration = randomInt(15, 120);
    const end = new Date(start.getTime() + minutesDuration * 60 * 1000);

    // Create participants with real references
    const participants: AppointmentParticipant[] = [
        {
            status: 'accepted',
            required: 'required',
            actor: {
                reference: `Patient/${randomPatientId}` as `Patient/${string}`,
                display: 'Patient'
            }
        },
        {
            status: 'accepted',
            required: 'required',
            actor: {
                reference: `Practitioner/${randomPractitionerId}` as `Practitioner/${string}`,
                display: 'Practitioner'
            }
        }
    ];

    const appointment: Appointment = {
        status: randomElement(statuses),
        participant: participants,
        start: startDate,
        end: end.toISOString(),
        minutesDuration,
        created: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
    };

    // Add optional fields randomly
    if (randomBoolean()) {
        appointment.description = `Appointment for ${randomElement(['consultation', 'follow-up', 'checkup', 'procedure', 'therapy'])}`;
    }

    if (randomBoolean()) {
        appointment.comment = `${randomElement(['Patient requested', 'Urgent', 'Regular', 'Annual'])} appointment`;
    }

    if (randomBoolean()) {
        appointment.priority = randomInt(0, 9);
    }

    if (randomBoolean()) {
        appointment.appointmentType = {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
                code: randomElement(['ROUTINE', 'WALKIN', 'CHECKUP', 'FOLLOWUP', 'EMERGENCY']),
                display: randomElement(['Routine', 'Walk-in', 'Checkup', 'Follow-up', 'Emergency'])
            }]
        };
    }

    if (randomBoolean()) {
        appointment.serviceCategory = [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-category',
                code: randomElement(['1', '2', '3', '8', '17']),
                display: randomElement(['General Practice', 'Cardiology', 'Dental', 'Physiotherapy', 'Radiology'])
            }]
        }];
    }

    if (randomBoolean()) {
        appointment.patientInstruction = 'Please arrive 15 minutes early for registration.';
    }

    // Add cancelationReason if status is noshow or cancelled
    if (appointment.status === 'noshow' || appointment.status === 'cancelled') {
        const cancelationReasons = [
            { code: 'pat', display: 'Patient' },
            { code: 'prov', display: 'Provider' },
            { code: 'maint', display: 'Equipment Maintenance/Repair' },
            { code: 'meds-inc', display: 'Preparation Incomplete' },
            { code: 'other', display: 'Other' },
            { code: 'oth-cms', display: 'Other: CMS Therapy Cap Service Not Available' },
            { code: 'oth-err', display: 'Other: Error' },
            { code: 'oth-fin', display: 'Other: Financial' },
            { code: 'oth-iv', display: 'Other: Improper IV Access/Infiltrate IV' },
            { code: 'oth-int', display: 'Other: No Interpreter Available' },
            { code: 'oth-mu', display: 'Other: Prep/Med Incomplete' },
            { code: 'oth-room', display: 'Other: Room/Resource Maintenance' },
            { code: 'oth-oerr', display: 'Other: Schedule Order Error' },
            { code: 'oth-swie', display: 'Other: Silent Walk In Error' },
            { code: 'oth-weath', display: 'Other: Weather' }
        ];

        const selectedReason = randomElement(cancelationReasons);
        appointment.cancelationReason = {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason',
                code: selectedReason.code,
                display: selectedReason.display
            }],
            text: selectedReason.display
        };
    }

    // Create the appointment in Aidbox
    const createdAppointment = await client.createAppointment(appointment);

    return createdAppointment;
}

// Function to create N appointments
export async function createMultipleAppointments(client: AidboxClient, count: number): Promise<Appointment[]> {
    console.log(`Creating ${count} appointments...`);
    const appointments: Appointment[] = [];

    for (let i = 0; i < count; i++) {
        try {
            const appointment = await createAppointmentWithRealResources(client);
            appointments.push(appointment);
            console.log(`Created appointment ${i + 1}/${count}: ${appointment.id}`);
        } catch (error) {
            console.error(`Failed to create appointment ${i + 1}/${count}:`, error);
        }
    }

    console.log(`Successfully created ${appointments.length} appointments`);
    return appointments;
}
