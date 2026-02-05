export default
{
  "category": [
    {
      "coding": [
        {
          "code": "vital-signs",
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "display": "vital-signs"
        }
      ]
    }
  ],
  "code": {
    "text": "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
    "coding": [
      {
        "code": "72514-3",
        "system": "http://loinc.org",
        "display": "Pain severity - 0-10 verbal numeric rating [Score] - Reported"
      }
    ]
  },
  "effectiveDateTime": "2020-12-22T11:07:07+00:00",
  "issued": "2020-12-22T11:07:07.442+00:00",
  "meta": {
    "extension": [
      {
        "url": "ex:createdAt",
        "valueInstant": "2024-10-17T12:32:33.201205Z"
      }
    ]
  },
  "encounter": {
    "reference": "Encounter/834823d5-da27-4685-ba3b-5bd316e92682"
  },
  "subject": {
    "reference": "Patient/fd7382da-c790-4b9d-bc2e-b4265a00a7f1"
  },
  "resourceType": "Observation",
  "status": "final",
  "valueQuantity": {
    "code": "{score}",
    "unit": "{score}",
    "value": 6,
    "system": "http://unitsofmeasure.org"
  }
}
