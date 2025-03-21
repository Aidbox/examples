import { Injectable } from '@nestjs/common'
import { MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { EhrEvent, EhrEventState } from 'src/interfaces/bundle'
import { randomUUID } from 'crypto'

const EventStorage: EhrEventState[] = []

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

  createEvent<T extends EhrEvent>(data: T) {
    const eventWithState: EhrEventState = {
      ...data,
      uuid: randomUUID(),
      unread: true
    }
    EventStorage.push(eventWithState)
    this.sendMessage(eventWithState)
  }

  sendMessage<T extends EhrEvent>(data: T) {
    const { recipient } = data

    console.log('\n\n\n')
    // console.log('This data will be send to the client:')
    // console.dir(data, { depth: 10 })

    if (this.clientStreams.has(recipient)) {
      console.log(`has client stream for ${recipient}`)
      this.clientStreams.get(recipient).next({ data })
    } else {
      console.log(`тщ client stream for ${recipient}`)
    }
  }

  getHistoryMessages(recipient: string) {
    return EventStorage.filter((data) => data.recipient === recipient)
  }

  markAsRead(ids: string[]) {
    EventStorage.forEach((message) => {
      if (ids.includes(message.uuid)) {
        message.unread = false
        this.sendMessage(message)
      }
    })
  }

  onModuleDestroy() {
    this.clientStreams.forEach((stream) => stream.complete())
    this.clientStreams.clear()
  }
}
