export default
{
  "class": {
    "code": "AMB",
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode"
  },
  "identifier": [
    {
      "use": "official",
      "value": "00020ea3-43a9-39bc-5fd0-08f58b370451",
      "system": "https://github.com/synthetichealth/synthea"
    }
  ],
  "location": [
    {
      "location": {
        "display": "WELLNESS ON WHEELS,PC",
        "reference": "Location?identifier=https://github.com/synthetichealth/synthea|373e6267-210e-35f3-956f-70c9a89c5f57"
      }
    }
  ],
  "participant": [
    {
      "type": [
        {
          "text": "primary performer",
          "coding": [
            {
              "code": "PPRF",
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "display": "primary performer"
            }
          ]
        }
      ],
      "period": {
        "end": "2013-07-17T22:32:56+00:00",
        "start": "2013-07-17T21:47:17+00:00"
      },
      "individual": {
        "display": "Dr. Wynell Mayert",
        "reference": "Practitioner?identifier=http://hl7.org/fhir/sid/us-npi|9999951590"
      }
    }
  ],
  "period": {
    "end": "2013-07-17T22:32:56+00:00",
    "start": "2013-07-17T21:47:17+00:00"
  },
  "resourceType": "Encounter",
  "serviceProvider": {
    "display": "WELLNESS ON WHEELS,PC",
    "reference": "Organization?identifier=https://github.com/synthetichealth/synthea|4705a8fd-19cd-32c1-8b3e-34bcfe84d0bd"
  },
  "status": "finished",
  "subject": {
    "display": "Mrs. Jesse Serena Ryan",
    "reference": "Patient?identifier=http://regcivil.cl/Validacion/RUN|11223344-5"
  },
  "type": [
    {
      "text": "General examination of patient (procedure)",
      "coding": [
        {
          "code": "162673000",
          "system": "http://snomed.info/sct",
          "display": "General examination of patient (procedure)"
        }
      ]
    }
  ]
}
