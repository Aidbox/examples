import { Injectable } from '@nestjs/common'
import { EventsService } from '../events/events.service'
import { AuthService } from '../auth/auth.service'
import { Encounter, SubscriptionBundle } from '../../interfaces/subscription'
import { Patient } from 'src/interfaces/patient'
import { ConfigService } from '@nestjs/config'
import { CreateEncounterBundle } from 'src/interfaces/bundle'

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

    console.log('Webhook from Aidbox received!')

    const encounterId = this.getEncounterId(payload)
    console.log(`Encounter ID: ${encounterId}`)

    const bundle = await this.fetchEncounterDetailed(encounterId)

    const practitionerId = this.getPractitionerId(bundle)

    console.log(`Practitioner ID: ${practitionerId}`)

    if (practitionerId) {
      this.eventsService.createEvent({
        type: 'encounter_created',
        recipient: practitionerId,
        date: new Date().toISOString(),
        bundle
      })
    }
  }

  private async fetchEncounterDetailed(encounterId: string): Promise<CreateEncounterBundle> {
    const credentials = this.authService.getSmartAppCredentials()
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + credentials
    }

    const url = `${this.aidboxUrl}/fhir/Encounter/?_id=${encounterId}&_include=Encounter:patient&_include=Encounter:practitioner&_revinclude:iterate=Condition:subject`

    console.log(url)

    const res = await fetch(url, {
      method: 'GET',
      headers
    })

    return await res.json()
  }

  private getPractitionerId(bundle: CreateEncounterBundle): string {

    const patient = bundle.entry.find(entry => entry.resource?.resourceType === 'Patient')?.resource as Patient

    const generalPractitionerRef = patient.generalPractitioner?.[0]?.reference

    const practitionerId = generalPractitionerRef ? generalPractitionerRef.split('/')[1] : null

    return practitionerId
  }

  private getEncounterId(payload: SubscriptionBundle): string {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      throw new Error('Invalid payload structure')
    }

    const encounter = payload.entry.find(entry => entry.resource?.resourceType === 'Encounter')?.resource as Encounter

    if (!encounter) {
      throw new Error('Encounter resource not found in payload')
    }

    return encounter?.id
  }
}
