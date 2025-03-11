import { Button, Col, Row, Typography } from 'antd'
import { LeftOutlined } from '@ant-design/icons'
import { ScrollableContent } from './scrollable-content'

const { Title } = Typography

export const NotificationSettings = ({ onBack }: { onBack: () => void }) => {
  return (
    <>
      <ScrollableContent
        header={
          <>
            <Row align="middle" gutter={8}>
              <Col>
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  onClick={onBack}
                />
              </Col>
              <Col>
                <Title level={4} style={{ margin: 0 }}>Settings</Title>
              </Col>
            </Row>
          </>
        }
        body={
          <></>
        }
      />
    </>
  )
}