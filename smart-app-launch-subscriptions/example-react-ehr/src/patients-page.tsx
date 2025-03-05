import { useState } from 'react'
import { Table, Input, Space, Typography, Menu } from 'antd'
import { LogoutOutlined, SearchOutlined } from '@ant-design/icons'
import { UserOutlined, FileOutlined } from '@ant-design/icons'
import Sider from 'antd/es/layout/Sider'
import { mockPatients } from './patients-mock'

const { Title } = Typography

const Patients = ({ onLogout }: { onLogout: () => Promise<void> }) => {
  const [searchText, setSearchText] = useState('')

  const filteredPatients = mockPatients.filter((patient) =>
    patient.name.toLowerCase().includes(searchText.toLowerCase())
  )

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age'
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender'
    },
    {
      title: 'Diagnosis',
      dataIndex: 'diagnosis',
      key: 'diagnosis'
    },
    {
      title: 'Last Visit',
      dataIndex: 'lastVisit',
      key: 'lastVisit'
    }
  ]

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex' }}>
      <Sider collapsible width={200}>
        <Menu theme="dark" mode="inline" selectedKeys={['1']}>
          <Menu.Item key="1" icon={<UserOutlined />}>
            My Patients
          </Menu.Item>
          <Menu.Item key="2" icon={<FileOutlined />}>
            Reports
          </Menu.Item>

          <Menu.Item key="logout" onClick={onLogout} icon={<LogoutOutlined />} style={{ marginTop: 'auto' }}>
            Logout
          </Menu.Item>
        </Menu>
      </Sider>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 10 }}>
          <Title level={2}>My Patients</Title>
        </div>
        <Space style={{ padding: 10, marginBottom: 16 }}>
          <Input
            placeholder="Search patient"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
        <div>
          <Table dataSource={filteredPatients} columns={columns}
            pagination={{ pageSize: 8 }} />
        </div>
      </div>
    </div>
  )
}

export default Patients