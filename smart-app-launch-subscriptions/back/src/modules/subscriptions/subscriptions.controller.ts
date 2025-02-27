import { Body, Controller, Post, Request } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsDto } from './dto/subscriptions.dto'

@Controller('subscriptions')
export class SubscriptionsController {

  constructor (
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  

  @Post('webhook-to-post-all-new-subscriptions-aidbox')
  postAllNewSubscriptionEvents(
    @Request() req: Request,
    @Body() payload: SubscriptionsDto,
  ) {
    console.log(req)
    return this.subscriptionsService.postAllNewSubscriptionEvents(payload)
  }
}