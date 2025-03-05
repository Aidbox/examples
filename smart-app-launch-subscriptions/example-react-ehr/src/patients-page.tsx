import { useState } from 'react'
import { Table, Input, Space, Menu, Breadcrumb, Typography } from 'antd'
import {
  UserOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  LineChartOutlined,
  ReadOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SearchOutlined
} from "@ant-design/icons"
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
        <Menu theme="dark" mode="inline" selectedKeys={["patients"]} style={{ height: "100%" }}>
          <div style={{ padding: "16px", textAlign: "center", color: "#fff" }}>
            <Title level={4} style={{ margin: 0, color: "white" }}>
              Example EHR
            </Title>
          </div>

          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            Clinical Dashboard
          </Menu.Item>

          <Menu.Item key="patients" icon={<UserOutlined />}>
            My Patients
          </Menu.Item>

          <Menu.Item key="documents" icon={<FileTextOutlined />}>
            Documents
          </Menu.Item>

          <Menu.Item key="tasks" icon={<FileDoneOutlined />}>
            Tasks
          </Menu.Item>

          <Menu.Item key="lab-orders" icon={<ExperimentOutlined />}>
            Lab Orders
          </Menu.Item>

          <Menu.Item key="immunizations" icon={<MedicineBoxOutlined />}>
            Immunizations
          </Menu.Item>

          <Menu.Item key="growth-chart" icon={<LineChartOutlined />}>
            Growth Chart
          </Menu.Item>

          <Menu.Item key="education" icon={<ReadOutlined />}>
            Education
          </Menu.Item>

          <Menu.Item key="logout" onClick={onLogout} icon={<LogoutOutlined />} style={{ marginTop: "auto" }}>
            Logout
          </Menu.Item>
        </Menu>
      </Sider>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 10 }}>
          <Breadcrumb>
            <Breadcrumb.Item>Smar App Subscriptions Example React EHR</Breadcrumb.Item>
            <Breadcrumb.Item>My Patients</Breadcrumb.Item>
          </Breadcrumb>
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