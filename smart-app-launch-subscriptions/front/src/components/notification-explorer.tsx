import { useState } from 'react'
import { NotificationMessage } from './notification-message'
import { NotificationDetails } from './notification-details'
import { Empty, List, Drawer } from 'antd'
import { EhrEvent } from '../interfaces/bundle'

export const NotificationExplorer = ({ events }: { events: EhrEvent[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<EhrEvent | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handleNotificationClick = (event: EhrEvent) => {
    setSelectedEvent(event)
    setDrawerVisible(true)
  }

  const handleBackClick = () => {
    setDrawerVisible(false)
  }

  return (
    <>
      {events.length ? (
        <List
          dataSource={events}
          renderItem={(event) => (
            <NotificationMessage
              event={event}
              onClick={handleNotificationClick}
            />
          )}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Empty description="No notifications" />
        </div>
      )}

      <Drawer
        title={null}
        placement="right"
        closable={false}
        onClose={handleBackClick}
        open={drawerVisible}
        width="100%"
        getContainer={false}
        mask={false}
        styles={{
          wrapper: { boxShadow: 'none' },
          content: { boxShadow: 'none', padding: 0 },
          body: { padding: 0 },
          header: { display: 'none' }
        }}
      >
        <NotificationDetails
          event={selectedEvent}
          onBack={handleBackClick}
        />
      </Drawer>
    </>
  )
}