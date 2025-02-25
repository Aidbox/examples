import { EhrEvent } from '../types'
import { List, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)

const { Text } = Typography

export const NotificationMessage = ({ event }: { event: EhrEvent }) => {
  return (
    <List.Item>
      <List.Item.Meta
        title={
          <Text>{event.msg}</Text>
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