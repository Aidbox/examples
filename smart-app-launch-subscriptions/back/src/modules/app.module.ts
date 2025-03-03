import { Module } from '@nestjs/common'
import { EventsModule } from './events/events.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    EventsModule,
    SubscriptionsModule,
    AuthModule
  ]
})

export class AppModule { }
