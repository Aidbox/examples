import { EhrEvent, EhrEventCreateEncounter } from '../interfaces'
import { Button, Typography } from 'antd'
import { LeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

interface NotificationDetailsProps {
  event: EhrEvent | null
  onBack: () => void
}

function flattenFhirObject(obj: Object, prefix = '', result: Record<string, string> = {}): Record<string, string> {
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

const TestEvent = {
  "class": {
    "code": "IMP",
    "display": "inpatient encounter"
  },
  "diagnosis": [
    {
      "use": {
        "coding": [
          {
            "code": "DD"
          }
        ]
      },
      "condition": {
        "display": "Acute myocardial infarction, unspecified",
        "reference": "Condition/71"
      }
    },
    {
      "use": {
        "coding": [
          {
            "code": "AD"
          }
        ]
      },
      "condition": {
        "display": "Acute myocardial infarction, unspecified",
        "reference": "Condition/71"
      }
    },
    {
      "use": {
        "coding": [
          {
            "code": "AD"
          }
        ]
      },
      "condition": {
        "display": "Type 2 diabetes mellitus without complications",
        "reference": "Condition/242"
      }
    }
  ],
  "hospitalization": {
    "admitSource": {
      "coding": [
        {
          "code": "emd"
        }
      ]
    },
    "dischargeDisposition": {
      "coding": [
        {
          "code": "home"
        }
      ]
    }
  },
  "id": "1000",
  "identifier": [
    {
      "value": "1000"
    }
  ],
  "length": {
    "code": "d",
    "unit": "days",
    "value": 6,
    "system": "http://unitsofmeasure.org"
  },
  "meta": {
    "lastUpdated": "2025-03-06T12:14:09.345458Z",
    "versionId": "9558",
    "extension": [
      {
        "url": "https://fhir.aidbox.app/fhir/StructureDefinition/created-at",
        "valueInstant": "2025-03-06T12:14:09.345458Z"
      }
    ]
  },
  "participant": [
    {
      "type": [
        {
          "coding": [
            {
              "code": "PPRF"
            }
          ]
        }
      ],
      "individual": {
        "display": "Williams John",
        "reference": "Practitioner/534"
      }
    }
  ],
  "period": {
    "end": "2024-01-10T00:00:00-04:56",
    "start": "2024-01-04T00:00:00-04:56"
  },
  "reasonCode": [
    {
      "coding": [
        {
          "code": "2876009",
          "display": "Hospital admission, type unclassified, explain by report"
        }
      ]
    }
  ],
  "resourceType": "Encounter",
  "serviceProvider": {
    "display": "Test Hospital",
    "reference": "Organization/106"
  },
  "status": "finished",
  "subject": {
    "display": "Carrot Peach",
    "reference": "Patient/178"
  }
}

const EventCommon = ({ event }: { event: EhrEvent }) => {
  // const data = flattenFhirObject(event.params)
  const data = flattenFhirObject(TestEvent ?? event)

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
  return <EventCommon event={event} />
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