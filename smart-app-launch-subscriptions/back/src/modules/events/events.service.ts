import { Injectable } from '@nestjs/common'
import { MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { EhrEventBase } from 'src/interfaces'

@Injectable()
export class EventsService {
  private clientStreams = new Map<string, Subject<MessageEvent>>()

  subscribe(userId: string): Observable<MessageEvent> {
    if (!this.clientStreams.has(userId)) {
      this.clientStreams.set(userId, new Subject<MessageEvent>())
    }
    return this.clientStreams.get(userId).asObservable()
  }

  unsubscribe(userId: string) {
    if (this.clientStreams.has(userId)) {
      this.clientStreams.get(userId).complete()
      this.clientStreams.delete(userId)
    }
  }

  sendMessage<T extends EhrEventBase>(data: T) {
    const { userId } = data

    if (this.clientStreams.has(userId)) {
      this.clientStreams.get(userId).next({ data })
    }
  }

  onModuleDestroy() {
    this.clientStreams.forEach((stream) => stream.complete())
    this.clientStreams.clear()
  }
}
