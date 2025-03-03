import { ConfigProvider, Popover } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EhrEvent, SmartAppLaunchSubscriptionsConfig } from './interfaces'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'

// todo - store apiKey in context

const App = ({ config, iframe, iframeDoc, iframeWindow }: { config: SmartAppLaunchSubscriptionsConfig, iframe: HTMLIFrameElement, iframeDoc: Document, iframeWindow: Window }) => {
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
        setEvents((prev) => [data, ...prev])
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

  const onOpenChange = useCallback((open: boolean) => {
    if (open) {
      iframe.style.width = '300px'
      iframe.style.height = '400px'
    } else {
      setTimeout(() => {
        iframe.style.width = '60px'
        iframe.style.height = '60px'
      }, 250)
    }
  }, [])

  return (
    <ConfigProvider>
      <div style={{ margin: 0, position: 'fixed', right: 10, bottom: 10 }}>
        <Popover
          content={<NotificationExplorer events={events} />}
          getPopupContainer={() => iframeDoc.body}
          placement='top'
          trigger={['click']}
          styles={{ body: { width: 300, height: 320, overflowY: 'auto' } }}
          onOpenChange={onOpenChange}
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