import { Button, Typography } from 'antd'
import { LeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ConditionResource, CreateEncounterBundle, EhrEvent, EhrEventCreateEncounter, EncounterResource, PatientResource } from '../interfaces/bundle'

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

const extractCreateEncounterData = (bundle: CreateEncounterBundle): { label: string, value: string }[] => {
  const encounterEntry = bundle.entry.find(e => e.resource.resourceType === 'Encounter')
  const patientEntry = bundle.entry.find(e => e.resource.resourceType === 'Patient')
  const conditionEntries = bundle.entry.filter(e => e.resource.resourceType === 'Condition')

  const encounter = encounterEntry?.resource as EncounterResource | undefined
  const patient = patientEntry?.resource as PatientResource | undefined
  const conditions = conditionEntries.map(c => c.resource) as ConditionResource[]

  return [
    { label: 'Encounter Status', value: encounter?.status ?? 'N/A' },
    { label: 'Encounter Class', value: encounter?.class?.display ?? 'N/A' },
    { label: 'Encounter Created At', value: encounter?.meta?.extension?.find(e => e.url === 'ex:createdAt')?.valueInstant ?? 'N/A' },

    { label: 'Patient Name', value: patient?.name?.map(n => `${n.prefix?.join(' ')} ${n.given?.join(' ')} ${n.family}`).join(', ') ?? 'N/A' },
    { label: 'Patient Birth Date', value: patient?.birthDate ?? 'N/A' },
    { label: 'Patient Gender', value: patient?.gender ?? 'N/A' },
    { label: 'Patient Address', value: patient?.address?.map(a => `${a.line?.join(' ')}, ${a.city}, ${a.state}, ${a.country}`).join('; ') ?? 'N/A' },
    { label: 'Patient Phone', value: patient?.telecom?.map(t => `${t.system}: ${t.value}`).join('; ') ?? 'N/A' },
    { label: 'Patient Managing Organization', value: patient?.managingOrganization?.display ?? 'N/A' },

    { label: 'Practitioner Reference', value: encounter?.generalPractitioner?.map(gp => gp.reference).join(', ') ?? 'N/A' },

    { label: 'Conditions', value: conditions.length > 0 ? conditions.map(c => `${c.code?.coding?.[0]?.display} (${c.clinicalStatus?.coding?.[0]?.code})`).join('; ') : 'N/A' }
  ]
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
    <>
      {data.map(({ label, value }) => (
        <div key={label} style={{ marginBottom: '8px' }}>
          <Text strong>{label}:</Text> <Text>{value}</Text>
        </div>
      ))}
    </>
  )
}

interface NotificationDetailsProps {
  event: EhrEvent | null
  onBack: () => void
}

export const NotificationDetails = ({ event, onBack }: NotificationDetailsProps) => {
  if (!event) return null

  const getEventTitle = (event: EhrEvent) => {
    switch (event.type) {
      case 'encounter_created':
        return 'New Encounter'
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
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={onBack}
          style={{ position: 'absolute' }}
        />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <Text strong>{getEventTitle(event)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Received {dayjs(event.date).format('MMM D, YYYY HH:mm')}
          </Text>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 10px' }}>
        {getEventContent(event)}
      </div>
    </div>
  )
} 