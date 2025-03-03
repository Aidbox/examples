import { NotificationMessage } from './notification-message'
import { EhrEvent } from '../interfaces'
import { Empty, List } from 'antd'

export const NotificationExplorer = ({ events }: { events: EhrEvent[] }) => {
  return (
    <>
      {
        events.length ? (
          <List
            dataSource={events}
            renderItem={(event) => <NotificationMessage event={event} />}
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Empty description="No notifications" />
          </div>
        )
      }
    </>
  )
}