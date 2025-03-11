import { ConfigProvider, Popover } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'
import { EhrEventState } from './interfaces/bundle'
import { useApp } from './context/app'

// todo - store iframeDoc (maybe all iFrame data) in context

const DefaultConfig = {
  height: 550,
  width: 350
}

const App = ({ iframe, iframeDoc, iframeWindow }: { iframe: HTMLIFrameElement, iframeDoc: Document, iframeWindow: Window }) => {
  const defaultBellSize = 50
  const shadowOffset = 20
  const bellOffset = shadowOffset
  const { config } = useApp()
  const [bellSize] = useState({ width: defaultBellSize + bellOffset, height: defaultBellSize + bellOffset })
  const [events, setEvents] = useState<EhrEventState[]>([])
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


        setEvents((prev) => {
          const index = prev.findIndex(e => e.uuid === data.uuid)

          if (index !== -1) {
            const updatedEvents = [...prev]
            updatedEvents[index] = data
            return updatedEvents
          } else {
            return [data, ...prev]
          }
        })
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
      iframe.style.width = `${width + shadowOffset * 2}px`
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
          content={<NotificationExplorer events={events} iframeDoc={iframeDoc} />}
          getPopupContainer={() => iframeDoc.body}
          placement='top'
          align={{ offset: [shadowOffset * -1, 0] }}
          trigger={['click']}
          styles={{
            body: {
              height: height - bellSize.height - bellOffset,
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