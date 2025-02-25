import { Controller, Get, Sse } from '@nestjs/common'
import { MessageEvent } from '@nestjs/common'
import { Subject } from 'rxjs'

export interface EhrEvent {
  date: string
  msg: string
}

@Controller('events')
export class EventsController {
  private eventStream = new Subject<MessageEvent>()

  @Sse()
  sendEvents() {
    return this.eventStream.asObservable()
  }

  sendMessage(data: EhrEvent) {
    this.eventStream.next({ data })
  }

  @Get('testnotif')
  async testnotif() {
    return this.sendMessage({
      msg: 'test',
      date: new Date().toISOString()
    })
  }
}