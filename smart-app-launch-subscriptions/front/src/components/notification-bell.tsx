import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'

type NotificationBellProps = {
  count: number
}

export const NotificationBell = ({ count }: NotificationBellProps) => {
  return (
    <Badge count={count} overflowCount={99} offset={[-5, 5]}>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<BellOutlined />}
      />
    </Badge>
  )
}