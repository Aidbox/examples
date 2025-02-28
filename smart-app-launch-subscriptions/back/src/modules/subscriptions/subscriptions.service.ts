import { Injectable } from '@nestjs/common'
import { SubscriptionsDto } from './dto/subscriptions.dto'
import { EventsService } from '../events/events.service'

@Injectable()
export class SubscriptionsService {

  constructor(
    private readonly eventsService: EventsService
  ) { }

  async postAllNewSubscriptionEvents(payload: SubscriptionsDto) {

    // TODO refactor
    console.log('postAllNewSubscriptionEvents:')

    console.dir(payload, { depth: 10 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encounter = (payload as any).entry[1].resource
    const patientRef = encounter.subject.reference
    const patientId = patientRef.split('/')[1]

    if (!patientId) {
      throw new Error('patient id is not defined')
    }

    // Client credentials
    const client_id = 'subscriptions'
    const client_secret = 'quOfCRS7ty1RMUQq'

    // Encode credentials in Base64
    const credentials = btoa(client_id + ':' + client_secret)

    // Headers for Basic Authentication
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + credentials
    }

    const res = await fetch(`http://localhost:8080/fhir/Patient/${patientId}`, {
      method: 'GET',
      headers
    })

    const body = await res.json()

    const generalPractitioner = body.generalPractitioner[0]?.reference

    const patientName = `${body.name[0].prefix[0]} ${body.name[0].given.join(', ')}`

    // todo - this .split looks ugly
    const practitionerId = generalPractitioner ? generalPractitioner.split('/')[1] : null

    console.log('\n\n\n')

    console.dir(body, { depth: 10 })

    if (practitionerId) {
      this.eventsService.sendMessage({
        userId: practitionerId,
        date: new Date().toISOString(),
        msg: `New encounter for ${patientName}`
      })
    }
  }
}
