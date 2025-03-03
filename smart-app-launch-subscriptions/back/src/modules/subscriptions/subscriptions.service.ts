import { Injectable } from '@nestjs/common'
import { EventsService } from '../events/events.service'
import { AuthService } from '../auth/auth.service'
import { Encounter, SubscriptionBundle } from '../../interfaces/subscription'
import { Patient } from 'src/interfaces/patient'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class SubscriptionsService {

  private aidboxUrl: string

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsService: EventsService,
    private readonly authService: AuthService
  ) {
    const aidboxUrl = this.configService.get<string>('AIDBOX_URL')
    if (!aidboxUrl) {
      throw new Error('Missing AIDBOX_URL in environment variables')
    }
    this.aidboxUrl = aidboxUrl
  }

  async postAllNewSubscriptionEvents(payload: SubscriptionBundle) {
    console.log('postAllNewSubscriptionEvents:')
    console.dir(payload, { depth: 10 })

    const encounter = this.getEncounter(payload)
    const patientId = this.getPatientId(encounter)
    const patient = await this.fetchPatientData(patientId)

    console.log('\n\n\n')
    console.log('patient: ')
    console.dir(patient, { depth: 10 })

    const practitionerId = this.getPractitionerId(patient)

    if (practitionerId) {
      this.eventsService.sendMessage({
        type: 'encounter_created',
        recipient: practitionerId,
        date: new Date().toISOString(),
        params: {
          encounter,
          patient
        }
      })
    }
  }

  private async fetchPatientData(patientId: string): Promise<Patient> {
    const credentials = this.authService.getSmartAppCredentials()
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + credentials
    }

    const res = await fetch(`${this.aidboxUrl}/fhir/Patient/${patientId}`, {
      method: 'GET',
      headers
    })

    return await res.json()
  }

  private getPractitionerId(patient: Patient): string {
    const generalPractitionerRef = patient.generalPractitioner?.[0]?.reference
    if (!generalPractitionerRef) {
      throw new Error('General practitioner reference is not defined')
    }

    const practitionerId = generalPractitionerRef.split('/')[1]
    if (!practitionerId) {
      throw new Error('Practitioner ID is not defined')
    }

    return practitionerId
  }

  private getEncounter(payload: SubscriptionBundle): Encounter {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      throw new Error('Invalid payload structure')
    }

    const encounter = payload.entry.find(entry => entry.resource?.resourceType === 'Encounter')?.resource as Encounter

    if (!encounter) {
      throw new Error('Encounter resource not found in payload')
    }

    return encounter
  }

  private getPatientId(encounter: Encounter): string {
    const patientRef = encounter.subject?.reference
    if (!patientRef) {
      throw new Error('Patient reference is not defined')
    }

    const patientId = patientRef.split('/')[1]

    if (!patientId) {
      throw new Error('patient id is not defined')
    }

    return patientId
  }
}
