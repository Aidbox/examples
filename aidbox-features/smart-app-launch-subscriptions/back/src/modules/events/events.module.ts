import { Module } from '@nestjs/common'
import { EventsService } from './events.service'
import { EventsController } from './events.controller'

@Module({
  providers: [EventsService],
  exports: [EventsService],
  controllers: [EventsController],
})
export class EventsModule { }
