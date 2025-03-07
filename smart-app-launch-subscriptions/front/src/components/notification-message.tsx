import { EhrEvent } from '../interfaces'
import { List, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import { RightOutlined } from '@ant-design/icons'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)

const { Text } = Typography

interface NotificationMessageProps {
  event: EhrEvent
  onClick: (event: EhrEvent) => void
}

export const NotificationMessage = ({ event, onClick }: NotificationMessageProps) => {

  const getMessage = (event: EhrEvent) => {
    switch (event.type) {
      case 'encounter_created':
        const { patient, encounter } = event.params
        const patientName = `${patient.name[0].prefix[0]} ${patient.name[0].given.join(', ')}`
        return `New encounter for ${patientName}: ${encounter.id}`
    }
    return ''
  }

  return (
    <List.Item
      onClick={() => onClick(event)}
      style={{ cursor: 'pointer' }}
      actions={[<RightOutlined key="arrow" />]}
      className="ant-list-item-action"
      extra={<RightOutlined />}
    >
      <List.Item.Meta
        title={
          <Text>{getMessage(event)}</Text>
        }
        description={
          <Text type="secondary">
            {dayjs(event.date).fromNow()}
          </Text>
        }
      />
    </List.Item>
  )
}