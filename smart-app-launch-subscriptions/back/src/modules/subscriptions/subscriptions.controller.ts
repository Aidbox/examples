import { Controller, Post } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'

@Controller('subscriptions')
export class SubscriptionsController {

  private subscriptionsService: SubscriptionsService

  @Post('webhook-to-post-all-new-subscriptions-aidbox')
  async postAllNewSubscriptionEvents() {
    return await this.subscriptionsService.postAllNewSubscriptionEvents()
  }
}