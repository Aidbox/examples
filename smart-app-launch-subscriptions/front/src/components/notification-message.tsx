import { Badge, List, Typography } from 'antd'
import { RightOutlined} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import { EhrEvent, EncounterResource, PatientResource } from '../interfaces/bundle'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)

const { Text } = Typography

interface NotificationMessageProps {
  event: EhrEvent
  onClick: (event: EhrEvent) => void
}

const getMessage = (event: EhrEvent) => {
  switch (event.type) {
    case 'encounter_created': {
      const encounterEntry = event.bundle.entry.find(e => e.resource.resourceType === 'Encounter')
      const patientEntry = event.bundle.entry.find(e => e.resource.resourceType === 'Patient')

      const encounter = encounterEntry?.resource as EncounterResource | undefined
      const patient = patientEntry?.resource as PatientResource | undefined

      if (!encounter || !patient) return 'Encounter created, but details are missing'

      const patientPrefix = patient.name?.[0]?.prefix?.[0] ?? ''
      const patientGiven = patient.name?.[0]?.given?.join(' ') ?? 'Unknown'
      const patientFamily = patient.name?.[0]?.family ?? ''
      const patientName = [patientPrefix, patientGiven, patientFamily].filter(Boolean).join(' ')
      const hospitalName = encounter.serviceProvider?.display ?? 'Unknown'
      const admissionDate = dayjs(encounter.period?.start).format('MMMM D, YYYY')

      return (
        <>
          <b>New Hospitalization:</b> {patientName} was admitted to {hospitalName} on <span style={{ color: '#52c41a' }}>{admissionDate}</span>.
        </>
      )
    }
    default:
      return ''
  }
}

export const NotificationMessage = ({ event, onClick }: NotificationMessageProps) => {
  return (
    <List.Item
      onClick={() => onClick(event)}
      style={{ cursor: 'pointer' }}
      className="ant-list-item-action"
      actions={[<RightOutlined />]}
    >
      <List.Item.Meta
        avatar={<Badge color="green" />}
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