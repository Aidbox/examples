export default
{
  "resourceType": "MedicationRequest",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "1049630",
        "display": "diphenhydrAMINE Hydrochloride 25 MG Oral Tablet"
      }
    ],
    "text": "diphenhydrAMINE Hydrochloride 25 MG Oral Tablet"
  },
  "subject": {
    "reference": "Patient/ecd7dffa-53ef-4590-948d-2594265d767b"
  },
  "encounter": {
    "reference": "Encounter/48fbd00b-13be-4002-9537-9c7fee9b81fc"
  },
  "authoredOn": "1960-09-15T03:52:22+03:00",
  "requester": {
    "reference": "Practitioner/0000016c-6b59-d6fd-0000-0000000000a0"
  },
  "dosageInstruction": [
    {
      "sequence": 1,
      "asNeededBoolean": true
    }
  ]
}
