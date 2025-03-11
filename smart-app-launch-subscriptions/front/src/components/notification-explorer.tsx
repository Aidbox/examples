import { useState } from 'react'
import { NotificationMessage } from './notification-message'
import { NotificationDetails } from './notification-details'
import { Empty, List, Drawer, Button, Row, Col, Tooltip, Typography } from 'antd'
import { EhrEvent, EhrEventState } from '../interfaces/bundle'
import { SettingOutlined } from '@ant-design/icons'
import { ScrollableContent } from './scrollable-content'
import { NotificationSettings } from './notification-settings'
import { useApp } from '../context/app'

const { Title } = Typography

export const NotificationExplorer = ({ events, iframeDoc }: { events: EhrEventState[], iframeDoc: Document }) => {
  const [selectedEvent, setSelectedEvent] = useState<EhrEvent | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'settings' | 'details'>('details')
  const { config } = useApp()

  const handleNotificationClick = async (event: EhrEventState) => {
    setSelectedEvent(event)
    setDrawerMode('details')
    setDrawerVisible(true)

    if (event.unread) {
      try {
        const response = await fetch(`${config.apiKey}/events/mark-as-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: [event.uuid] })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Marked as read:', data)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
  }

  const handleSettingsClick = () => {
    setDrawerMode('settings')
    setDrawerVisible(true)
  }

  const handleBackClick = () => {
    setDrawerVisible(false)
  }

  return (
    <>
      <ScrollableContent
        header={
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={4} style={{ margin: 0 }}>Notifications</Title>
            </Col>
            <Col>
              <Tooltip title="Settings" getPopupContainer={() => iframeDoc.body}>
                <Button
                  type="text"
                  icon={<SettingOutlined style={{ fontSize: 20 }} />}
                  onClick={handleSettingsClick}
                />
              </Tooltip>
            </Col>
          </Row>
        }
        body={
          <List
            dataSource={events}
            renderItem={(event) => (
              <NotificationMessage
                event={event}
                onClick={(event) => handleNotificationClick(event)}
              />
            )}
            locale={{ emptyText: <Empty description="No notifications" /> }}
          />
        }
      />

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
          body: { padding: 12 },
          header: { display: 'none' }
        }}
      >
        {drawerMode === 'settings' ? (
          <NotificationSettings onBack={handleBackClick} />
        ) : (
          selectedEvent && <NotificationDetails event={selectedEvent} onBack={handleBackClick} />
        )}
      </Drawer>
    </>
  )
}