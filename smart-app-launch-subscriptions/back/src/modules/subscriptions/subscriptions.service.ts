import { Injectable } from '@nestjs/common'
import { SubscriptionsDto } from './dto/subscriptions.dto'

@Injectable()
export class SubscriptionsService {
  async postAllNewSubscriptionEvents(payload: SubscriptionsDto) {
    console.log('postAllNewSubscriptionEvents:')
    console.log(payload)
    return []
  }
}
