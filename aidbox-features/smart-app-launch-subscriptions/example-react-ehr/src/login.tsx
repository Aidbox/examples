import { useState } from "react"
import { Form, Input, Button, Typography, Card } from "antd"
import { LockOutlined, UserOutlined } from "@ant-design/icons"

const { Title } = Typography

const LoginForm = ({ onSubmit }: { onSubmit: (username: string, password: string) => Promise<void> }) => {
  const [email, setEmail] = useState("house@example.com")
  const [password, setPassword] = useState("securepassword")

  const handleSubmit = () => {
    onSubmit(email, password)
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#001529"
      }}
    >
      <Card
        style={{
          width: 400,
          padding: 24,
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={3} style={{ marginBottom: 48 }}>
            Smar App Subscriptions Example React EHR
          </Title>
        </div>

        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="email"
            rules={[{ required: true, message: "Please enter your email" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              Log In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default LoginForm