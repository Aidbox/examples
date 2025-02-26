import { ConfigProvider, Popover } from 'antd'
import { useEffect, useState } from 'react'
import { EhrEvent, SmartAppLaunchSubscriptionsConfig } from './types'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'

const App = ({ config, iframeDocument }: { config: SmartAppLaunchSubscriptionsConfig, iframeDocument: Document }) => {
  // const [userId, setUserId] = useState<string | null>(null)
  const [events, setEvents] = useState<EhrEvent[]>([])
  const userId = 'asd'

  useEffect(() => {
    // todo - store apiKey in context
    const eventSource = new EventSource(`${config.apiKey}/events?userId=${userId}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log(event)
      setEvents((prev) => [...prev, data])
    }

    // window.addEventListener('message', (event) => {
    //   if (event.data?.type === 'NOTIFICATIONS_UPDATE_USER') {
    //     setUserId(event.data.userId)
    //   }
    // })
  }, [])

  return (
    <ConfigProvider>
      <div style={{ margin: 10, position: 'relative' }}>
        <Popover
          content={<NotificationExplorer events={events} />}
          getPopupContainer={() => iframeDocument.body}
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