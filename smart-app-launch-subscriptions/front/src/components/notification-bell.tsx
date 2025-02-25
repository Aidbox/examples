import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'

interface NotificationBellProps {
  count: number
  onClick: () => void
}

export const NotificationBell = ({ count, onClick }: NotificationBellProps) => {
  return (
    <Badge count={count} overflowCount={99} offset={[-5, 5]}>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<BellOutlined />}
        onClick={onClick}
      />
    </Badge>
  )
}