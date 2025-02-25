import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventsService } from './events.service'
import { EventsController } from './events.controller'

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule { }
