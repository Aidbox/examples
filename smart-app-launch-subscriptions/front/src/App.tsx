import { NotificationExplorer } from './components/notification-explorer'
import { useEffect, useState } from 'react'
import { SmartAppLaunchSubscriptionsConfig } from './types'

const App = ({ config }: { config: SmartAppLaunchSubscriptionsConfig }) => {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATIONS_UPDATE_USER') {
        setUserId(event.data.userId)
      }
    })
  }, [])

  return (
    <>
      <div style={{ border: '1px solid #ddd', padding: 10 }}>User ID: {userId ?? 'Guest'}</div>
      <NotificationExplorer config={config} />
    </>
  )
}

export default App
