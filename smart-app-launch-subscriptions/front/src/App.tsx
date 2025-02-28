import { ConfigProvider, Popover } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { EhrEvent, SmartAppLaunchSubscriptionsConfig } from './interfaces'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'

// todo - store apiKey in context

const App = ({ config, iframeDoc, iframeWindow }: { config: SmartAppLaunchSubscriptionsConfig, iframeDoc: Document, iframeWindow: Window }) => {
  const [events, setEvents] = useState<EhrEvent[]>([])
  const [uid, setUid] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_USER') {
        setUid(event.data.uid)
      }
    }

    iframeWindow.addEventListener('message', handleMessage)

    return () => iframeWindow.removeEventListener('message', handleMessage)
  }, [iframeWindow])

  useEffect(() => {
    if (eventSourceRef.current) {
      console.log('Closing existing SSE connection...')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (uid) {
      console.log(`Subscribing to SSE for user: ${uid}`)
      const eventSource = new EventSource(`${config.apiKey}/events?userId=${uid}`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('New SSE event:', data)
        setEvents((prev) => [...prev, data])
      }

      eventSource.onerror = () => {
        console.warn('SSE connection error, closing...')
        eventSource.close()
        eventSourceRef.current = null
      }

      return () => {
        console.log('Unsubscribing from SSE')
        eventSource.close()
        eventSourceRef.current = null
      }
    }
  }, [config.apiKey, uid])

  useEffect(() => {
    setEvents([])
  }, [uid])

  return (
    <ConfigProvider>
      <div style={{ margin: 10, position: 'relative' }}>
        <Popover
          content={<NotificationExplorer events={events} />}
          getPopupContainer={() => iframeDoc.body}
          placement='bottom'
          trigger={['click']}
          styles={{ root: { minWidth: 300, maxHeight: 400 } }}
        >
          <span>
            <NotificationBell count={events.length} />
          </span>
        </Popover>
      </div>
    </ConfigProvider>
  )
}

export default App