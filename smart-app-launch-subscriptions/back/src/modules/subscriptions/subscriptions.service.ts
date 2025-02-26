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
    console.log(payload)

    this.eventsService.sendMessage({
      userId: 'asd', // doctor's id in our case,
      date: new Date().toISOString(),
      msg: payload ? JSON.stringify(payload) : ''
    })

    return []
  }
}
