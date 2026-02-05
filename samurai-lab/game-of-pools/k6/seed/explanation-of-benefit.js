export default
{
  "resourceType": "ExplanationOfBenefit",
  "contained": [
    {
      "resourceType": "ServiceRequest",
      "id": "referral",
      "status": "completed",
      "intent": "order",
      "subject": {
        "reference": "Patient/bf663c54-fae5-4787-8220-451dd503151b"
      },
      "requester": {
        "reference": "Practitioner/bc1a13e7-da50-4f90-bd7c-40f4a887f091"
      },
      "performer": [
        {
          "reference": "Practitioner/bc1a13e7-da50-4f90-bd7c-40f4a887f091"
        }
      ]
    },
    {
      "resourceType": "Coverage",
      "id": "coverage",
      "status": "active",
      "type": {
        "text": "private"
      },
      "beneficiary": {
        "reference": "Patient/bf663c54-fae5-4787-8220-451dd503151b"
      },
      "payor": [
        {
          "display": "private"
        }
      ]
    }
  ],
  "identifier": [
    {
      "system": "https://bluebutton.cms.gov/resources/variables/clm_id",
      "value": "5c71dc7e-c1bb-4a39-ade2-cfc0fcf28d35"
    },
    {
      "system": "https://bluebutton.cms.gov/resources/identifier/claim-group",
      "value": "99999999999"
    }
  ],
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "institutional"
      }
    ]
  },
  "use": "claim",
  "patient": {
    "reference": "Patient/bf663c54-fae5-4787-8220-451dd503151b"
  },
  "billablePeriod": {
    "start": "2017-11-04T16:51:19+03:00",
    "end": "2018-11-04T16:51:19+03:00"
  },
  "created": "2017-11-04T16:51:19+03:00",
  "insurer": {
    "display": "private"
  },
  "provider": {
    "reference": "Practitioner/bc1a13e7-da50-4f90-bd7c-40f4a887f091"
  },
  "referral": {
    "reference": "#referral"
  },
  "claim": {
    "reference": "Claim/5c71dc7e-c1bb-4a39-ade2-cfc0fcf28d35"
  },
  "outcome": "complete",
  "careTeam": [
    {
      "sequence": 1,
      "provider": {
        "reference": "Practitioner/bc1a13e7-da50-4f90-bd7c-40f4a887f091"
      },
      "role": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/claimcareteamrole",
            "code": "primary",
            "display": "Primary Care Practitioner"
          }
        ]
      }
    }
  ],
  "insurance": [
    {
      "focal": true,
      "coverage": {
        "reference": "#coverage",
        "display": "private"
      }
    }
  ],
  "item": [
    {
      "sequence": 1,
      "category": {
        "coding": [
          {
            "system": "https://bluebutton.cms.gov/resources/variables/line_cms_type_srvc_cd",
            "code": "1",
            "display": "Medical care"
          }
        ]
      },
      "productOrService": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "185349003",
            "display": "Encounter for check up (procedure)"
          }
        ],
        "text": "Encounter for check up (procedure)"
      },
      "servicedPeriod": {
        "start": "2017-11-04T16:36:19+03:00",
        "end": "2017-11-04T16:51:19+03:00"
      },
      "locationCodeableConcept": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/ex-serviceplace",
            "code": "19",
            "display": "Off Campus-Outpatient Hospital"
          }
        ]
      },
      "encounter": [
        {
          "reference": "Encounter/eca46f85-90a6-4154-8ab4-2a7f08f1b8ae"
        }
      ]
    },
    {
      "sequence": 2,
      "informationSequence": [
        1
      ],
      "category": {
        "coding": [
          {
            "system": "https://bluebutton.cms.gov/resources/variables/line_cms_type_srvc_cd",
            "code": "1",
            "display": "Medical care"
          }
        ]
      },
      "productOrService": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/sid/cvx",
            "code": "08",
            "display": "Hep B, adolescent or pediatric"
          }
        ],
        "text": "Hep B, adolescent or pediatric"
      },
      "servicedPeriod": {
        "start": "2017-11-04T16:36:19+03:00",
        "end": "2017-11-04T16:51:19+03:00"
      },
      "locationCodeableConcept": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/ex-serviceplace",
            "code": "19",
            "display": "Off Campus-Outpatient Hospital"
          }
        ]
      },
      "net": {
        "value": 140.52,
        "currency": "USD"
      },
      "adjudication": [
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_coinsrnc_amt",
                "display": "Line Beneficiary Coinsurance Amount"
              }
            ]
          },
          "amount": {
            "value": 28.104000000000003,
            "currency": "USD"
          }
        },
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_prvdr_pmt_amt",
                "display": "Line Provider Payment Amount"
              }
            ]
          },
          "amount": {
            "value": 112.41600000000001,
            "currency": "USD"
          }
        },
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_sbmtd_chrg_amt",
                "display": "Line Submitted Charge Amount"
              }
            ]
          },
          "amount": {
            "value": 140.52,
            "currency": "USD"
          }
        },
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_alowd_chrg_amt",
                "display": "Line Allowed Charge Amount"
              }
            ]
          },
          "amount": {
            "value": 140.52,
            "currency": "USD"
          }
        },
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_bene_ptb_ddctbl_amt",
                "display": "Line Beneficiary Part B Deductible Amount"
              }
            ]
          },
          "amount": {
            "value": 0,
            "currency": "USD"
          }
        },
        {
          "category": {
            "coding": [
              {
                "system": "https://bluebutton.cms.gov/resources/codesystem/adjudication",
                "code": "https://bluebutton.cms.gov/resources/variables/line_prcsg_ind_cd",
                "display": "Line Processing Indicator Code"
              }
            ]
          }
        }
      ]
    }
  ],
  "total": [
    {
      "category": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/adjudication",
            "code": "submitted",
            "display": "Submitted Amount"
          }
        ],
        "text": "Submitted Amount"
      },
      "amount": {
        "value": 265.52,
        "currency": "USD"
      }
    }
  ],
  "payment": {
    "amount": {
      "value": 112.41600000000001,
      "currency": "USD"
    }
  }
}
