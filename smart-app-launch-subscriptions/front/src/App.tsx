import { ConfigProvider } from 'antd'
import { useEffect, useState } from 'react'
import { SmartAppLaunchSubscriptionsConfig } from './types'
import { NotificationExplorer } from './components/notification-explorer'
import { NotificationBell } from './components/notification-bell'

const App = ({ config }: { config: SmartAppLaunchSubscriptionsConfig }) => {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATIONS_UPDATE_USER') {
        setUserId(event.data.userId)
      }
    })
  }, [])

  console.log(userId)

  return (
    <ConfigProvider>
      <NotificationBell count={3} onClick={() => { }} />
      <NotificationExplorer config={config} />
    </ConfigProvider>
  )
}

export default App