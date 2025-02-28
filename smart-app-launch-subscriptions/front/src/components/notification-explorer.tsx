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
            style={{ maxHeight: 200, overflowY: 'auto' }}
          />
        ) : (
          <Empty description="No notifications" />
        )
      }
    </>
  )
}