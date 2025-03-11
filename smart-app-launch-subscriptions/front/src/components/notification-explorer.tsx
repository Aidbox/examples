import { useState } from 'react'
import { NotificationMessage } from './notification-message'
import { NotificationDetails } from './notification-details'
import { Empty, List, Drawer, Button } from 'antd'
import { EhrEvent } from '../interfaces/bundle'
import { SettingOutlined } from '@ant-design/icons'


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
      {/* <div style={{ display: 'flex' }}>
        <h2>Notifications</h2>
        <SettingOutlined />
      </div> */}
      {events.length ? (
        <List
          dataSource={events}
          header={
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <h3 style={{ margin: 0 }}>Notifications</h3>
              <Button style={{ marginLeft: 'auto', border: 'none' }} icon={<SettingOutlined />}></Button>
            </div>
          }
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