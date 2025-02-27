import { Controller, Post, Req } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { Request } from 'express'

// todo - check for existing conventional solutions
const parseFhirBody = (body: Buffer) => {
  const raw = body.toString('utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Cannot parse FHIR body: ${error?.message ?? 'unknown'}`)
  }
}

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