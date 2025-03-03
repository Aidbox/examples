import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsController } from './subscriptions.controller'
import { EventsModule } from '../events/events.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    EventsModule,
    AuthModule
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule { }
