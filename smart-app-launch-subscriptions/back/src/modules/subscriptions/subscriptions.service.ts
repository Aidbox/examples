import { Injectable } from '@nestjs/common'
import { SubscriptionsDto } from './dto/subscriptions.dto'
import { EventsService } from '../events/events.service'

@Injectable()
export class SubscriptionsService {

  constructor(
    private readonly eventsService: EventsService
  ) { }

  async postAllNewSubscriptionEvents(payload: SubscriptionsDto) {
    console.log('postAllNewSubscriptionEvents:')

    console.dir(payload, { depth: 10 })


    // TODO refactor

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

    const res = await fetch('http://localhost:8080/fhir/Patient/01a12c22-f97a-2804-90f6-d77b5c68387c', {
      method: 'GET',
      headers
    })

    const body = await res.json()

    const generalPractitioner = body.generalPractitioner[0]?.reference

    // todo - this .split looks ugly
    const practitionerId = generalPractitioner ? generalPractitioner.split('/')[1] : null

    console.log('\n\n\n')

    console.dir(body, { depth: 10 })

    if (practitionerId) {
      this.eventsService.sendMessage({
        userId: practitionerId,
        date: new Date().toISOString(),
        msg: payload ? JSON.stringify(payload) : ''
      })
    }
  }
}
