import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsController } from './subscriptions.controller'

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule { }
