import { Injectable } from '@nestjs/common'
import { SubscriptionsDto } from './dto/subscriptions.dto'

@Injectable()
export class SubscriptionsService {
  async postAllNewSubscriptionEvents(payload: SubscriptionsDto) {
    console.log('postAllNewSubscriptionEvents:')
    console.log(payload)

    // const data = Enctouner, Practitioner, Patient []

    // get somehow relevant active sessions of practitioners

    // const relevantData = data.filter((item) => item.resourceType === payload.name)

    // this.eventsService.sendMessage(data)
    return []
  }
}
