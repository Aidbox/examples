import { List, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import { EhrEvent, PatientResource } from '../interfaces/bundle'

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

      const encounter = encounterEntry?.resource
      const patient = patientEntry?.resource as PatientResource | undefined

      if (!encounter || !patient) return 'Encounter created, but details are missing'

      const patientPrefix = patient.name?.[0]?.prefix?.[0] ?? ''
      const patientGiven = patient.name?.[0]?.given?.join(' ') ?? 'Unknown'
      const patientFamily = patient.name?.[0]?.family ?? ''
      const patientName = [patientPrefix, patientGiven, patientFamily].filter(Boolean).join(' ')

      return `New encounter for ${patientName || 'Unknown Patient'}: ${encounter.id ?? 'No ID'}`
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
    >
      <List.Item.Meta
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