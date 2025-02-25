import { Module } from '@nestjs/common'
import { EventsModule } from './events/events.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'

@Module({
  imports: [
    EventsModule,
    SubscriptionsModule
  ]
})

export class AppModule { }
