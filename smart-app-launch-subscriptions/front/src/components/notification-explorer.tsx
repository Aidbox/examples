import { useEffect, useState } from 'react'
import { NotificationMessage } from './notification-message'
import { EhrEvent, SmartAppLaunchSubscriptionsConfig } from '../types'

export const NotificationExplorer = ({ config }: { config: SmartAppLaunchSubscriptionsConfig }) => {
  const [events, setEvents] = useState<EhrEvent[]>([])

  // todo - store apiKey in context

  useEffect(() => {
    const eventSource = new EventSource(`${config.apiKey}/events`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log(event)
      setEvents((prev) => [...prev, data])
    }

    // eventSource.onerror = () => {
    //   eventSource.close()
    // }

    // return () => {
    //   eventSource.close()
    // }
  }, [])

  return (
    <>
      {
        events.map(event => (
          <NotificationMessage event={event} />
        ))
      }
    </>
  )
}