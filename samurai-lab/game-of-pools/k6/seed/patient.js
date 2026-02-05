export default
{
    "resourceType": "Patient",
    "gender": "female",
    "birthDate": "2007-03-07",
    "multipleBirthBoolean": false,
    "address": [
        {
            "city": "Groveland",
            "line": ["460 Gulgowski Gate Unit 14"],
            "state": "MA",
            "country": "US",
            "extension": [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/geolocation",
                    "extension": [
                        {"url": "latitude", "valueDecimal": 42.77964158567175},
                        {"url": "longitude", "valueDecimal": -71.02719205793963}
                    ]
                }
            ]
        }
    ],
    "name": [{"use": "official",
              "given": ["Pok428"],
              "family": "Metz686"}],
    "extension": [
        {
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            "extension": [
                {
                    "url": "ombCategory",
                    "valueCoding": {
                        "code": "2106-3",
                        "system": "urn:oid:2.16.840.1.113883.6.238",
                        "display": "White"
                    }
                },
                {"url": "text", "valueString": "White"}
            ]
        },
        {
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
            "extension": [
                {
                    "url": "ombCategory",
                    "valueCoding": {
                        "code": "2186-5",
                        "system": "urn:oid:2.16.840.1.113883.6.238",
                        "display": "Not Hispanic or Latino"
                    }
                },
                {
                    "url": "text",
                    "valueString": "Not Hispanic or Latino"
                }
            ]
        },
        {
            "url": "http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName",
            "valueString": "Mona85 Lindgren255"
        },
        {
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
            "valueCode": "F"
        },
        {
            "url": "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
            "valueAddress": {
                "city": "Everett",
                "state": "Massachusetts",
                "country": "US"
            }
        },
        {
            "url": "http://synthetichealth.github.io/synthea/disability-adjusted-life-years",
            "valueDecimal": 0.17858231070891684
        },
        {
            "url": "http://synthetichealth.github.io/synthea/quality-adjusted-life-years",
            "valueDecimal": 13.821417689291083
        }
    ],
    "communication": [
        {
            "language": {
                "text": "English",
                "coding": [
                    {
                        "code": "en-US",
                        "system": "urn:ietf:bcp:47",
                        "display": "English"
                    }
                ]
            }
        }
    ],
    "identifier": [
        {
            "value": "7ec34f99-4ae7-bb4c-cc1c-4ab0bc19784f",
            "system": "https://github.com/synthetichealth/synthea"
        },
        {
            "type": {
                "text": "Medical Record Number",
                "coding": [
                    {
                        "code": "MR",
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "display": "Medical Record Number"
                    }
                ]
            },
            "value": "7ec34f99-4ae7-bb4c-cc1c-4ab0bc19784f",
            "system": "http://hospital.smarthealthit.org"
        },
        {
            "type": {
                "text": "Social Security Number",
                "coding": [
                    {
                        "code": "SS",
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "display": "Social Security Number"
                    }
                ]
            },
            "value": "999-40-7241",
            "system": "http://hl7.org/fhir/sid/us-ssn"
        }
    ],
    "telecom": [
        {
            "use": "home",
            "value": "555-414-4084",
            "system": "phone"
        }
    ],
    "maritalStatus": {
        "text": "Never Married",
        "coding": [
            {
                "code": "S",
                "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                "display": "Never Married"
            }
        ]
    }
}
