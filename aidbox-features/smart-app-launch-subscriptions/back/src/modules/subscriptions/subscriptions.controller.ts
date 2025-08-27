import { Controller, Post, Req } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { Request } from 'express'
import { parseFhirBody } from 'src/utils'

@Controller('subscriptions')
export class SubscriptionsController {

  constructor(
    private readonly subscriptionsService: SubscriptionsService
  ) { }

  @Post('webhook-to-post-all-new-subscriptions-aidbox')
  postAllNewSubscriptionEvents(@Req() req: Request) {
    this.subscriptionsService.postAllNewSubscriptionEvents(parseFhirBody(req.body))
  }
}