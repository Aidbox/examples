import { Injectable } from '@nestjs/common'
import { MessageEvent } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { EhrEvent, EhrEventState } from 'src/interfaces/bundle'
import { randomUUID } from 'crypto'

const Storage: EhrEventState[] = []

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

  sendMessage<T extends EhrEvent>(data: T) {
    const { recipient } = data

    console.log('\n\n\n')
    console.log('This data will be send to the client:')
    console.dir(data, { depth: 10 })

    const eventWithState: EhrEventState = {
      ...data,
      uuid: randomUUID(),
      unread: true
    }

    if (this.clientStreams.has(recipient)) {
      this.clientStreams.get(recipient).next({ data: eventWithState })
    }

    Storage.push(eventWithState)
  }

  getHistoryMessages(recipient: string) {
    return Storage.filter((data) => data.recipient === recipient)
  }

  markAsRead(ids: string[]) {
    Storage.forEach((message) => {
      if (ids.includes(message.uuid)) {
        message.unread = false
      }
    })
  }

  onModuleDestroy() {
    this.clientStreams.forEach((stream) => stream.complete())
    this.clientStreams.clear()
  }
}
