import { useEffect, useState } from 'react'
import { NotificationMessage } from './notification-message'
import { EhrEvent } from '../types'

export const NotificationExplorer = () => {
  const [events, setEvents] = useState<EhrEvent[]>([])

  useEffect(() => {
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`)

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