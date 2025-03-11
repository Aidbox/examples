import { Button, Col, Divider, Row, Space, Typography } from 'antd'
import { LeftOutlined, UserOutlined } from '@ant-design/icons'
import { ConditionResource, CreateEncounterBundle, EhrEvent, EhrEventCreateEncounter, EncounterDetailsData, EncounterResource, PatientResource } from '../interfaces/bundle'
import Title from 'antd/es/typography/Title'
import dayjs from 'dayjs'
import { ScrollableContent } from './scrollable-content'

const { Text } = Typography

const flattenFhirObject = (obj: Object, prefix = '', result: Record<string, string> = {}): Record<string, string> => {
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue

    const newKey = prefix ? `${prefix}_${key}` : key
    const value = obj[key as keyof typeof obj];

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        (value as Record<string, any>[]).forEach((item, index) => {
          flattenFhirObject(item, `${newKey}_${index + 1}`, result);
        });
      } else {
        flattenFhirObject(value, newKey, result);
      }
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

const extractCreateEncounterData = (bundle: CreateEncounterBundle): EncounterDetailsData => {
  const encounterEntry = bundle.entry.find(e => e.resource.resourceType === 'Encounter')
  const patientEntry = bundle.entry.find(e => e.resource.resourceType === 'Patient')
  const conditionEntries = bundle.entry.filter(e => e.resource.resourceType === 'Condition')

  const encounter = encounterEntry?.resource as EncounterResource | undefined
  const patient = patientEntry?.resource as PatientResource | undefined
  const conditions = conditionEntries.map(c => c.resource) as ConditionResource[]

  return {
    name: patient?.name?.map(n => `${n.prefix?.join(' ')} ${n.given?.join(' ')} ${n.family}`).join(', ') ?? 'N/A',
    yearsOld: patient?.birthDate ? `${Math.floor((new Date().getTime() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} y.o.` : 'N/A',
    gender: patient?.gender ?? 'N/A',
    phone: patient?.telecom?.map(t => t.value).join('; ') ?? 'N/A',
    hospital: encounter?.serviceProvider?.display ?? 'N/A',
    class: encounter?.class?.display ?? 'N/A',
    admissionDate: encounter?.period?.start ? dayjs(encounter.period.start).format('MMMM D, YYYY') : 'N/A',
    attendingPhysician: encounter?.participant?.map(p => p.individual?.display).join(', ') ?? 'N/A',
    diagnosis: conditions
  }
}

const EventCommon = ({ event }: { event: EhrEvent }) => {
  const data = flattenFhirObject(event.bundle)

  return (
    <>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <Text strong>{key.split('_').join(' ')}:</Text> <Text>{value}</Text>
        </div>
      ))}
    </>
  )
}

const EventEncounterCreated = ({ event }: { event: EhrEventCreateEncounter }) => {
  const data = extractCreateEncounterData(event.bundle)

  return (
    // <Card style={{ maxWidth: 500, margin: "auto", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
    <div>
      <Space align="start" style={{ display: "flex" }}>
        <UserOutlined style={{ fontSize: 40, color: "#ccc" }} />
        <div>
          <Title level={5} style={{ margin: 0 }}>{data.name}, {data.yearsOld}, {data.gender}</Title>
          <Text type="secondary">Phone: {data.phone}</Text>
        </div>
      </Space>
      <Divider />
      <Title level={5}>Hospitalization Info</Title>
      <Text><strong>Hospital:</strong> {data.hospital}</Text><br />
      <Text><strong>Class:</strong> {data.class}</Text><br />
      <Text><strong>Admission Date:</strong> {data.admissionDate}</Text><br />
      <Text><strong>Attending Physician:</strong> {data.attendingPhysician}</Text>
      <Divider />
      <Title level={5}>Diagnosis</Title>
      {data.diagnosis.map((condition, index) => (
        <div key={index} style={{ marginBottom: '8px' }}>
          <Text><strong>{condition.code?.coding[0]?.display ?? 'Unknown Condition'}</strong> (<Text code>{condition.code?.coding?.[0]?.code ?? 'N/A'}</Text>)</Text>
        </div>
      ))}
    </div>
    // </Card>
  )
}

interface NotificationDetailsProps {
  event: EhrEvent
  onBack: () => void
}

export const NotificationDetails = ({ event, onBack }: NotificationDetailsProps) => {
  const getEventTitle = (event: EhrEvent) => {
    switch (event.type) {
      case 'encounter_created':
        return 'New Hospitalization'
      default:
        return 'New Event'
    }
  }

  const getEventContent = (event: EhrEvent) => {
    switch (event.type) {
      case 'encounter_created':
        return <EventEncounterCreated event={event} />
      default:
        return <EventCommon event={event} />
    }
  }

  return (
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
              <Title level={4} style={{ margin: 0 }}>{getEventTitle(event)}</Title>
            </Col>
          </Row>
        </>
      }
      body={getEventContent(event)}
    />
    // <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
    //   <div style={{ position: 'relative', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
    //     <Button
    //       type="text"
    //       icon={<LeftOutlined />}
    //       onClick={onBack}
    //       style={{ position: 'absolute' }}
    //     />
    //     <div style={{ flex: 1 }}>
    //       <Text strong>{getEventTitle(event)}</Text>
    //     </div>
    //   </div>
    //   <div style={{ flex: 1, overflow: 'auto', padding: '0 10px' }}>
    //     {getEventContent(event)}
    //   </div>
    // </div>
  )
} 