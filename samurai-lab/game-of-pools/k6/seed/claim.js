export default
{
  "resourceType": "Claim",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "pharmacy"
      }
    ]
  },
  "use": "claim",
  "patient": {
    "reference": "Patient/ecd7dffa-53ef-4590-948d-2594265d767b"
  },
  "billablePeriod": {
    "start": "1960-09-01T03:52:22+03:00",
    "end": "1960-09-15T03:52:22+03:00"
  },
  "created": "1960-09-15T03:52:22+03:00",
  "provider": {
    "reference": "Organization/4861d01f-019c-3dac-a153-8334e50919f9"
  },
  "priority": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/processpriority",
        "code": "normal"
      }
    ]
  },
  "prescription": {
    "reference": "MedicationRequest/a55f4ab9-0a7d-41c1-ab78-1458317eb1ed"
  },
  "insurance": [
    {
      "sequence": 1,
      "focal": true,
      "coverage": {
        "display": "private"
      }
    }
  ],
  "item": [
    {
      "sequence": 1,
      "productOrService": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "185345009",
            "display": "Encounter for symptom"
          }
        ],
        "text": "Encounter for symptom"
      },
      "encounter": [
        {
          "reference": "Encounter/48fbd00b-13be-4002-9537-9c7fee9b81fc"
        }
      ]
    }
  ],
  "total": {
    "value": 255.0,
    "currency": "USD"
  }
}
