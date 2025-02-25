import { Body, Controller, Post } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsDto } from './dto/subscriptions.dto'

@Controller('subscriptions')
export class SubscriptionsController {

  constructor (
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  

  @Post('webhook-to-post-all-new-subscriptions-aidbox')
  postAllNewSubscriptionEvents(
    @Body() payload: SubscriptionsDto,
  ) {
    return this.subscriptionsService.postAllNewSubscriptionEvents(payload)
  }
}