import { ConfigProvider, Popover } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EhrEvent, SmartAppLaunchSubscriptionsConfig } from './interfaces'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'

// todo - store apiKey in context

const DefaultConfig = {
  height: 400,
  width: 300
}

const App = ({ config, iframe, iframeDoc, iframeWindow }: { config: SmartAppLaunchSubscriptionsConfig, iframe: HTMLIFrameElement, iframeDoc: Document, iframeWindow: Window }) => {
  const bellOffset = 10
  const [bellSize] = useState({ width: 60, height: 60 })
  const [events, setEvents] = useState<EhrEvent[]>([])
  const [uid, setUid] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const bellRef = useRef<HTMLSpanElement | null>(null)

  const height = config.height ?? DefaultConfig.height
  const width = config.width ?? DefaultConfig.width

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_USER') {
        setUid(event.data.uid)
      }
    }

    iframeWindow.addEventListener('message', handleMessage)

    return () => iframeWindow.removeEventListener('message', handleMessage)
  }, [iframeWindow])

  useEffect(() => {//
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

  useEffect(() => {
    setFrameSize(false)
  }, [])

  const setFrameSize = useCallback((open: boolean) => {
    if (open) {
      iframe.style.width = `${width}px`
      iframe.style.height = `${height}px`
    } else {
      setTimeout(() => {
        iframe.style.width = `${bellSize.width}px`
        iframe.style.height = `${bellSize.height}px`
      }, 250)
    }
  }, [])

  return (
    <ConfigProvider>
      <div style={{
        margin: 0,
        position: 'fixed',
        right: bellOffset,
        bottom: bellOffset
      }}>
        <Popover
          content={<NotificationExplorer events={events} />}
          getPopupContainer={() => iframeDoc.body}
          placement='top'
          trigger={['click']}
          styles={{
            body: {
              height: height - bellSize.height - bellOffset * 2,
              overflowY: 'auto',
              width
            }
          }}
          onOpenChange={setFrameSize}
        >
          <span style={{ display: 'inline-block' }} ref={bellRef}>
            <NotificationBell count={events.length} />
          </span>
        </Popover>
      </div>
    </ConfigProvider>
  )
}

export default App