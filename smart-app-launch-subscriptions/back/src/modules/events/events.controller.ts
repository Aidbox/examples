import { Controller, Req, Res, Sse } from '@nestjs/common'
import { MessageEvent } from '@nestjs/common'
import { Request, Response } from 'express'
import { Observable } from 'rxjs'
import { EventsService } from './events.service'

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService
  ) { }

  @Sse()
  sendEvents(@Req() req: Request, @Res() res: Response): Observable<MessageEvent> {
    const userId = req.query.userId as string
    if (!userId) {
      throw new Error('User ID is required')
    }

    const stream = this.eventsService.subscribe(userId)

    res.on('close', () => {
      this.eventsService.unsubscribe(userId)
    })

    return stream
  }
}