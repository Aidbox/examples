export const patientData = {
  resourceType: "Bundle",
  type: "transaction",
  entry: [
    {
      resource: {
        address: [
          {
            city: "Dordrecht",
            line: ["Laan Van Europa 1600"],
            country: "NL",
            postalCode: "3317 DB",
          },
        ],
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips"],
        },
        name: [{ given: ["Martha"], family: "DeLarosa" }],
        birthDate: "1972-05-01",
        resourceType: "Patient",
        active: true,
        id: "2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        identifier: [{ value: "574687583", system: "urn:oid:2.16.840.1.113883.2.4.6.3" }],
        telecom: [{ use: "home", value: "+31788700800", system: "phone" }],
        gender: "female",
        contact: [
          {
            name: { given: ["Martha"], family: "Mum" },
            address: {
              city: "Lyon",
              line: ["Promenade des Anglais 111"],
              country: "FR",
              postalCode: "69001",
            },
            telecom: [{ use: "home", value: "+33-555-20036", system: "phone" }],
            relationship: [
              {
                coding: [
                  {
                    code: "MTH",
                    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                  },
                ],
              },
            ],
          },
        ],
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Patient</b><a name="2b90dd2b-2dab-4c75-9bb9-a355e07401e8"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Patient &quot;2b90dd2b-2dab-4c75-9bb9-a355e07401e8&quot; </p></div><p><b>identifier</b>: id: 574687583</p><p><b>active</b>: true</p><p><b>name</b>: Martha DeLarosa </p><p><b>telecom</b>: <a href="tel:+31788700800">+31788700800</a></p><p><b>gender</b>: female</p><p><b>birthDate</b>: 1972-05-01</p><p><b>address</b>: Laan Van Europa 1600 Dordrecht 3317 DB NL </p><h3>Contacts</h3><table class="grid"><tr><td>-</td><td><b>Relationship</b></td><td><b>Name</b></td><td><b>Telecom</b></td><td><b>Address</b></td></tr><tr><td>*</td><td>mother <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-v3-RoleCode.html">RoleCode</a>#MTH)</span></td><td>Martha Mum </td><td><a href="tel:+33-555-20036">+33-555-20036</a></td><td>Promenade des Anglais 111 Lyon 69001 FR </td></tr></table></div>',
          status: "generated",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
      },
    },
    {
      resource: {
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips",
          ],
        },
        dosage: [
          {
            route: {
              coding: [
                {
                  code: "20053000",
                  system: "http://standardterms.edqm.eu",
                  display: "Oral use",
                },
              ],
            },
            timing: { repeat: { count: 1, periodUnit: "d" } },
            doseAndRate: [
              {
                doseQuantity: {
                  code: "1",
                  unit: "tablet",
                  value: 1,
                  system: "http://unitsofmeasure.org",
                },
                type: {
                  coding: [
                    {
                      code: "ordered",
                      system: "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                      display: "Ordered",
                    },
                  ],
                },
              },
            ],
          },
        ],
        resourceType: "MedicationStatement",
        status: "active",
        id: "c220e36c-eb67-4fc4-9ba1-2fabc52acec6",
        identifier: [
          {
            value: "b75f92cb-61d4-469a-9387-df5ef70d25f0",
            system: "urn:oid:1.2.3.999",
          },
        ],
        medicationReference: {
          reference: "Medication/976d0804-cae0-45ae-afe3-a19f3ceba6bc",
        },
        subject: { reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8" },
        effectivePeriod: { start: "2015-03" },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: MedicationStatement</b><a name="c220e36c-eb67-4fc4-9ba1-2fabc52acec6"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource MedicationStatement &quot;c220e36c-eb67-4fc4-9ba1-2fabc52acec6&quot; </p></div><p><b>identifier</b>: id: b75f92cb-61d4-469a-9387-df5ef70d25f0</p><p><b>status</b>: active</p><p><b>medication</b>: <a href="#Medication_976d0804-cae0-45ae-afe3-a19f3ceba6bc">See above (Medication/976d0804-cae0-45ae-afe3-a19f3ceba6bc)</a></p><p><b>subject</b>: <a href="#Patient_2b90dd2b-2dab-4c75-9bb9-a355e07401e8">See above (Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8)</a></p><p><b>effective</b>: 2015-03 --&gt; (ongoing)</p><blockquote><p><b>dosage</b></p><p><b>timing</b>: Count 1 times, Do Once</p><p><b>route</b>: Oral use <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (standardterms.edqm.eu#20053000)</span></p></blockquote></div>',
          status: "generated",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/MedicationStatement/c220e36c-eb67-4fc4-9ba1-2fabc52acec6",
      },
    },
    {
      resource: {
        code: {
          coding: [
            {
              code: "108774000",
              system: "http://snomed.info/sct",
              display: "Product containing anastrozole (medicinal product)",
            },
            {
              code: "99872",
              system: "urn:oid:2.16.840.1.113883.2.4.4.1",
              display: "ANASTROZOL 1MG TABLET",
            },
            {
              code: "2076667",
              system: "urn:oid:2.16.840.1.113883.2.4.4.7",
              display: "ANASTROZOL CF TABLET FILMOMHULD 1MG",
            },
            {
              code: "L02BG03",
              system: "http://www.whocc.no/atc",
              display: "anastrozole",
            },
          ],
        },
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Medication-uv-ips"],
        },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Medication</b><a name="976d0804-cae0-45ae-afe3-a19f3ceba6bc"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Medication &quot;976d0804-cae0-45ae-afe3-a19f3ceba6bc&quot; </p></div><p><b>code</b>: Product containing anastrozole (medicinal product) <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#108774000; unknown#99872 &quot;ANASTROZOL 1MG TABLET&quot;; unknown#2076667 &quot;ANASTROZOL CF TABLET FILMOMHULD 1MG&quot;; <a href="http://terminology.hl7.org/4.0.0/CodeSystem-v3-WC.html">WHO ATC</a>#L02BG03 &quot;anastrozole&quot;)</span></p></div>',
          status: "generated",
        },
        id: "976d0804-cae0-45ae-afe3-a19f3ceba6bc",
        resourceType: "Medication",
      },
      request: {
        method: "PUT",
        url: "/fhir/Medication/976d0804-cae0-45ae-afe3-a19f3ceba6bc",
      },
    },
    {
      resource: {
        code: {
          text: "Black Cohosh Extract herbal supplement",
          coding: [
            {
              code: "412588001",
              system: "http://snomed.info/sct",
              display: "Cimicifuga racemosa extract (substance)",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      { url: "lang", valueCode: "nl-NL" },
                      { url: "content", valueString: "Zwarte Cohosh Extract" },
                    ],
                  },
                ],
              },
            },
            {
              code: "G02CX04",
              system: "http://www.whocc.no/atc",
              display: "Cimicifugae rhizoma",
            },
          ],
        },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Medication</b><a name="8adc0999-9468-4ac9-9557-680fa133d626"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Medication &quot;8adc0999-9468-4ac9-9557-680fa133d626&quot; </p></div><p><b>code</b>: Black Cohosh Extract herbal supplement <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#412588001 &quot;Cimicifuga racemosa extract (substance)&quot;; <a href="http://terminology.hl7.org/4.0.0/CodeSystem-v3-WC.html">WHO ATC</a>#G02CX04 &quot;Cimicifugae rhizoma&quot;)</span></p></div>',
          status: "generated",
        },
        id: "8adc0999-9468-4ac9-9557-680fa133d626",
        resourceType: "Medication",
        meta: {
          lastUpdated: "2024-05-06T09:58:26.363476Z",
          versionId: "69",
          extension: [
            { url: "ex:createdAt", valueInstant: "2024-05-06T09:58:26.363476Z" },
          ],
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Medication/8adc0999-9468-4ac9-9557-680fa133d626",
      },
    },
    {
      resource: {
        code: {
          coding: [
            {
              code: "no-known-food-allergies",
              system: "http://hl7.org/fhir/uv/ips/CodeSystem/absent-unknown-uv-ips",
            },
          ],
        },
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips",
          ],
        },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: AllergyIntolerance</b><a name="c7781f44-6df8-4a8b-9e06-0b34263a47c5"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource AllergyIntolerance &quot;c7781f44-6df8-4a8b-9e06-0b34263a47c5&quot; </p></div><p><b>clinicalStatus</b>: Active <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-allergyintolerance-clinical.html">AllergyIntolerance Clinical Status Codes</a>#active)</span></p><p><b>code</b>: No known food allergies <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="CodeSystem-absent-unknown-uv-ips.html">Absent and Unknown Data - IPS</a>#no-known-food-allergies)</span></p><p><b>patient</b>: <a href="#Patient_2b90dd2b-2dab-4c75-9bb9-a355e07401e8">See above (Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8)</a></p></div>',
          status: "generated",
        },
        patient: { reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8" },
        clinicalStatus: {
          coding: [
            {
              code: "active",
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
            },
          ],
        },
        id: "c7781f44-6df8-4a8b-9e06-0b34263a47c5",
        resourceType: "AllergyIntolerance",
      },
      request: {
        method: "PUT",
        url: "/fhir/AllergyIntolerance/c7781f44-6df8-4a8b-9e06-0b34263a47c5",
      },
    },
    {
      resource: {
        patient: { reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8" },
        category: ["medication"],
        criticality: "high",
        clinicalStatus: {
          coding: [
            {
              code: "active",
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
            },
          ],
        },
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips",
          ],
        },
        type: "allergy",
        resourceType: "AllergyIntolerance",
        id: "72884cad-ebe6-4f43-a51a-2f978275f132",
        code: {
          coding: [
            {
              code: "373270004",
              system: "http://snomed.info/sct",
              display:
                "Substance with penicillin structure and antibacterial mechanism of action (substance)",
            },
          ],
        },
        identifier: [
          {
            value: "3a462598-009c-484a-965c-d6b24a821424",
            system: "urn:oid:1.2.3.999",
          },
        ],
        onsetDateTime: "2010",
        verificationStatus: {
          coding: [
            {
              code: "confirmed",
              system:
                "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
            },
          ],
        },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: AllergyIntolerance</b><a name="72884cad-ebe6-4f43-a51a-2f978275f132"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource AllergyIntolerance &quot;72884cad-ebe6-4f43-a51a-2f978275f132&quot; </p></div><p><b>identifier</b>: id: 3a462598-009c-484a-965c-d6b24a821424</p><p><b>clinicalStatus</b>: Active <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-allergyintolerance-clinical.html">AllergyIntolerance Clinical Status Codes</a>#active)</span></p><p><b>verificationStatus</b>: Confirmed <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-allergyintolerance-verification.html">AllergyIntolerance Verification Status</a>#confirmed)</span></p><p><b>type</b>: allergy</p><p><b>category</b>: medication</p><p><b>criticality</b>: high</p><p><b>code</b>: Substance with penicillin structure and antibacterial mechanism of action (substance) <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#373270004)</span></p><p><b>patient</b>: <a href="#Patient_2b90dd2b-2dab-4c75-9bb9-a355e07401e8">See above (Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8)</a></p><p><b>onset</b>: 2010</p></div>',
          status: "generated",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/AllergyIntolerance/72884cad-ebe6-4f43-a51a-2f978275f132",
      },
    },
    {
      resource: {
        category: [
          {
            coding: [{ code: "75326-9", system: "http://loinc.org", display: "Problem" }],
          },
        ],
        clinicalStatus: {
          coding: [
            {
              code: "active",
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            },
          ],
        },
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips"],
        },
        resourceType: "Condition",
        recordedDate: "2016-10",
        id: "c64139e7-f02d-409c-bf34-75e8bf23bc80",
        severity: {
          coding: [{ code: "LA6751-7", system: "http://loinc.org", display: "Moderate" }],
        },
        code: {
          coding: [
            {
              code: "198436008",
              system: "http://snomed.info/sct",
              display: "Menopausal flushing (finding)",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      { url: "lang", valueCode: "nl-NL" },
                      { url: "content", valueString: "opvliegers" },
                    ],
                  },
                ],
              },
            },
            {
              code: "N95.1",
              system: "http://hl7.org/fhir/sid/icd-10",
              display: "Menopausal and female climacteric states",
            },
          ],
        },
        identifier: [
          {
            value: "c87bf51c-e53c-4bfe-b8b7-aa62bdd93002",
            system: "urn:oid:1.2.3.999",
          },
        ],
        onsetDateTime: "2015",
        verificationStatus: {
          coding: [
            {
              code: "confirmed",
              system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            },
          ],
        },
        subject: { reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8" },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Condition</b><a name="c64139e7-f02d-409c-bf34-75e8bf23bc80"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Condition &quot;c64139e7-f02d-409c-bf34-75e8bf23bc80&quot; </p></div><p><b>identifier</b>: id: c87bf51c-e53c-4bfe-b8b7-aa62bdd93002</p><p><b>clinicalStatus</b>: Active <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-condition-clinical.html">Condition Clinical Status Codes</a>#active)</span></p><p><b>verificationStatus</b>: Confirmed <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-condition-ver-status.html">ConditionVerificationStatus</a>#confirmed)</span></p><p><b>category</b>: Problem <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#75326-9)</span></p><p><b>severity</b>: Moderate <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#LA6751-7)</span></p><p><b>code</b>: Menopausal flushing (finding) <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#198436008; <a href="http://terminology.hl7.org/4.0.0/CodeSystem-icd10.html">ICD-10</a>#N95.1 &quot;Menopausal and female climacteric states&quot;)</span></p><p><b>subject</b>: <a href="#Patient_2b90dd2b-2dab-4c75-9bb9-a355e07401e8">See above (Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8)</a></p><p><b>onset</b>: 2015</p><p><b>recordedDate</b>: 2016-10</p></div>',
          status: "generated",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Condition/c64139e7-f02d-409c-bf34-75e8bf23bc80",
      },
    },
    {
      resource: {
        category: [
          {
            coding: [{ code: "75326-9", system: "http://loinc.org", display: "Problem" }],
          },
        ],
        clinicalStatus: {
          coding: [
            {
              code: "remission",
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            },
          ],
        },
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips"],
        },
        resourceType: "Condition",
        id: "c4597aa2-688a-401b-a658-70acc6de28c6",
        severity: {
          coding: [{ code: "LA6750-9", system: "http://loinc.org", display: "Severe" }],
        },
        code: {
          coding: [
            {
              code: "254837009",
              system: "http://snomed.info/sct",
              display: "Malignant tumor of breast",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      { url: "lang", valueCode: "nl-NL" },
                      {
                        url: "content",
                        valueString:
                          "Borstkanker stadium II zonder aanwijzingen van recidieven na behandeling",
                      },
                    ],
                  },
                ],
              },
            },
            {
              code: "8500/3",
              system: "http://terminology.hl7.org/CodeSystem/icd-o-3",
              display: "Infiltrating duct carcinoma, NOS",
            },
          ],
        },
        identifier: [
          {
            value: "66d4a8c7-9081-43e0-a63f-489c2ae6edd6",
            system: "urn:oid:1.2.3.999",
          },
        ],
        onsetDateTime: "2015-01",
        abatementDateTime: "2015-03",
        verificationStatus: {
          coding: [
            {
              code: "confirmed",
              system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            },
          ],
        },
        subject: { reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8" },
        text: {
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Condition</b><a name="c4597aa2-688a-401b-a658-70acc6de28c6"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Condition &quot;c4597aa2-688a-401b-a658-70acc6de28c6&quot; </p></div><p><b>identifier</b>: id: 66d4a8c7-9081-43e0-a63f-489c2ae6edd6</p><p><b>clinicalStatus</b>: Remission <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-condition-clinical.html">Condition Clinical Status Codes</a>#remission)</span></p><p><b>verificationStatus</b>: Confirmed <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/4.0.0/CodeSystem-condition-ver-status.html">ConditionVerificationStatus</a>#confirmed)</span></p><p><b>category</b>: Problem <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#75326-9)</span></p><p><b>severity</b>: Severe <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#LA6750-9)</span></p><p><b>code</b>: Malignant tumor of breast <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#254837009; <a href="http://terminology.hl7.org/4.0.0/CodeSystem-icd-o-3.html">International Classification of Diseases for Oncology, version 3.</a>#8500/3 &quot;Infiltrating duct carcinoma, NOS&quot;)</span></p><p><b>subject</b>: <a href="#Patient_2b90dd2b-2dab-4c75-9bb9-a355e07401e8">See above (Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8)</a></p><p><b>onset</b>: 2015-01</p><p><b>abatement</b>: 2015-03</p></div>',
          status: "generated",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Condition/c4597aa2-688a-401b-a658-70acc6de28c6",
      },
    },
    {
      resource: {
        resourceType: "Procedure",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips"],
        },
        id: "eumfh-39-07-1",
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Procedure</b><a name="eumfh-39-07-1"> </a><a name="hceumfh-39-07-1"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Procedure &quot;eumfh-39-07-1&quot; </p></div><p><b>status</b>: completed</p><p><b>category</b>: Surgical procedure <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#387713003)</span></p><p><b>code</b>: Previous balloon angioplasty on mid-LAD stenosis with STENT Implantation <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#36969009 &quot;Placement of stent in coronary artery&quot;; <a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#233258006 &quot;Balloon angioplasty of artery&quot;)</span></p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07: Alexander Heig (inject 39-07)</a> &quot; HEIG&quot;</p><p><b>performed</b>: ?? --&gt; (ongoing)</p></div>',
        },
        status: "completed",
        category: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "387713003",
              display: "Surgical procedure",
            },
          ],
        },
        code: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "36969009",
              display: "Placement of stent in coronary artery",
            },
            {
              system: "http://snomed.info/sct",
              code: "233258006",
              display: "Balloon angioplasty of artery",
            },
          ],
          text: "Previous balloon angioplasty on mid-LAD stenosis with STENT Implantation",
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        performedPeriod: {
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/data-absent-reason",
              valueCode: "unknown",
            },
          ],
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Procedure/eumfh-39-07-1",
      },
    },
    {
      resource: {
        resourceType: "Immunization",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips"],
        },
        id: "40b7b6a0-c043-423a-9959-be3707e728b2",
        language: "fr-LU",
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml" xml:lang="fr-LU" lang="fr-LU">\n\t\t\t\t\t\t<p>\n\t\t\t\t\t\t\t<b>Marie Lux-Brennard</b>\n\t\t\t\t\t\t\t(Apr 17, 1998)\n\t\t\t\t\t\t</p>\n\t\t\t\t\t\t<p>Vaccin anti diphtérie-coqueluche-tétanos-poliomyélite, Jun 3, 1998, 10:00:00 PM</p>\n\t\t\t\t\t\t<p>Voie intramusculaire, Cuisse droite</p>\n\t\t\t\t\t</div>',
        },
        status: "completed",
        vaccineCode: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "836508001",
              display:
                "Bordetella pertussis and Clostridium tetani and Corynebacterium diphtheriae and Human poliovirus antigens-containing vaccine product",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      {
                        url: "lang",
                        valueCode: "fr-LU",
                      },
                      {
                        url: "content",
                        valueString:
                          "Vaccin anti diphtérie-coqueluche-tétanos-poliomyélite",
                      },
                    ],
                  },
                ],
              },
            },
            {
              system: "http://www.whocc.no/atc",
              code: "J07CA02",
              display: "diphtheria-pertussis-poliomyelitis-tetanus",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      {
                        url: "lang",
                        valueCode: "fr-LU",
                      },
                      {
                        url: "content",
                        valueString: "DIPHTERIE - COQUELUCHE - POLIOMYELITE - TETANOS",
                      },
                    ],
                  },
                ],
              },
            },
          ],
          text: "Vaccin anti diphtérie-coqueluche-tétanos-poliomyélite",
        },
        patient: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        occurrenceDateTime: "1998-06-04T00:00:00+02:00",
        primarySource: true,
        lotNumber: "AXK23RWERS",
        expirationDate: "2000-06-01",
        site: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "11207009",
              display: "Right thigh",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      {
                        url: "lang",
                        valueCode: "fr-LU",
                      },
                      {
                        url: "content",
                        valueString: "Cuisse droite",
                      },
                    ],
                  },
                ],
              },
            },
          ],
          text: "Cuisse droite",
        },
        route: {
          coding: [
            {
              system: "http://standardterms.edqm.eu",
              code: "20035000",
              display: "Intramuscular use",
              _display: {
                extension: [
                  {
                    url: "http://hl7.org/fhir/StructureDefinition/translation",
                    extension: [
                      {
                        url: "lang",
                        valueCode: "fr-LU",
                      },
                      {
                        url: "content",
                        valueString: "Voie intramusculaire",
                      },
                    ],
                  },
                ],
              },
            },
          ],
          text: "Voie intramusculaire",
        },
        protocolApplied: [
          {
            targetDisease: [
              {
                coding: [
                  {
                    system: "http://snomed.info/sct",
                    code: "27836007",
                    display: "Pertussis",
                  },
                  {
                    system: "http://snomed.info/sct",
                    code: "76902006",
                    display: "Tetanus",
                  },
                  {
                    system: "http://snomed.info/sct",
                    code: "398102009",
                    display: "Acute poliomyelitis",
                  },
                  {
                    system: "http://snomed.info/sct",
                    code: "397430003",
                    display: "Diphtheria caused by Corynebacterium diphtheriae",
                  },
                ],
              },
            ],
            doseNumberPositiveInt: 1,
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Immunization/40b7b6a0-c043-423a-9959-be3707e728b2",
      },
    },
    {
      resource: {
        resourceType: "Device",
        id: "ips-example-imaging-1",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Device-uv-ips"],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml">No known devices in use</div>',
        },
        identifier: [
          {
            system: "http://my.organization.example/devicesID",
            value: "12345",
          },
        ],
        manufacturer: "Imaging Devices Manufacturer",
        deviceName: [
          {
            name: "H.I.A. BEGIN",
            type: "patient-reported-name",
          },
        ],
        modelNumber: "2.0.1",
        patient: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
          display: "Annelise Black (inject 70-275)",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Device/ips-example-imaging-1",
      },
    },
    {
      resource: {
        resourceType: "DeviceUseStatement",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/DeviceUseStatement-uv-ips",
          ],
        },
        id: "eumfh-70-275-1",
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml">No known devices in use</div>',
        },
        status: "active",
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
          display: "Annelise Black (inject 70-275)",
        },
        timingDateTime: "2017-12",
        device: {
          reference: "Device/ips-example-imaging-1",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/DeviceUseStatement/eumfh-70-275-1",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "pregnancy-outcome-example",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-outcome-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="pregnancy-outcome-example"> </a><a name="hcpregnancy-outcome-example"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;pregnancy-outcome-example&quot; </p></div><p><b>status</b>: final</p><p><b>code</b>: [#] Births total <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#11640-0)</span></p><p><b>subject</b>: <a href="Patient-patient-example-female.html">Patient/patient-example-female</a> &quot; DELAROSA&quot;</p><p><b>effective</b>: 2020-01-10</p><p><b>value</b>: 1 1<span style="background: LightGoldenRodYellow"> (Details: UCUM code 1 = \'1\')</span></p></div>',
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11640-0",
              display: "[#] Births total",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2020-01-10",
        valueQuantity: {
          value: 1,
          system: "http://unitsofmeasure.org",
          code: "1",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/pregnancy-outcome-example",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "tobacco-use-example",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-tobaccouse-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="tobacco-use-example"> </a><a name="hctobacco-use-example"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;tobacco-use-example&quot; </p></div><p><b>status</b>: final</p><p><b>code</b>: Tobacco smoking status <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#72166-2)</span></p><p><b>subject</b>: <a href="Patient-patient-example-female.html">Patient/patient-example-female</a> &quot; DELAROSA&quot;</p><p><b>effective</b>: 2019-07-15</p><p><b>value</b>: Former smoker <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#LA15920-4)</span></p></div>',
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "72166-2",
              display: "Tobacco smoking status",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2019-07-15",
        valueCodeableConcept: {
          coding: [
            {
              system: "http://loinc.org",
              code: "LA15920-4",
              display: "Former smoker",
            },
          ],
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/tobacco-use-example",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "hemoglobin",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-laboratory-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="hemoglobin"> </a><a name="hchemoglobin"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;hemoglobin&quot; </p></div><p><b>status</b>: final</p><p><b>category</b>: Laboratory <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/5.5.0/CodeSystem-observation-category.html">Observation Category Codes</a>#laboratory)</span></p><p><b>code</b>: Hemoglobin A1c/Hemoglobin.total in Blood by HPLC <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#17856-6)</span></p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07</a> &quot; HEIG&quot;</p><p><b>effective</b>: 2017-11-10 08:20:00+0100</p><p><b>performer</b>: <a href="Organization-TII-Organization1.html">Organization/TII-Organization1</a> &quot;Someplace General Hospital&quot;</p><p><b>value</b>: 7.5 %<span style="background: LightGoldenRodYellow"> (Details: UCUM code % = \'%\')</span></p><p><b>note</b>: Above stated goal of 7.0 %</p></div>',
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "17856-6",
              display: "Hemoglobin A1c/Hemoglobin.total in Blood by HPLC",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2017-11-10T08:20:00+01:00",
        performer: [
          {
            reference: "Organization/TII-Organization1",
          },
        ],
        valueQuantity: {
          value: 7.5,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: "%",
        },
        note: [
          {
            text: "Above stated goal of 7.0 %",
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/hemoglobin",
      },
    },
    {
      resource: {
        resourceType: "DiagnosticReport",
        id: "hemoglobin",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/DiagnosticReport-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><h2><span title="Codes: {http://loinc.org 11502-2}">Laboratory report</span> (<span title="Codes: {http://terminology.hl7.org/CodeSystem/v2-0074 LAB}">Laboratory</span>) </h2><table class="grid"><tr><td>Subject</td><td><b>Alexander Heig </b> male, DoB: 1957 ( <code>http://trilliumbridge.eu/fhir/demos/eumfh/inject</code>/39-07)</td></tr><tr><td>When For</td><td>2017-11-10</td></tr><tr><td>Reported</td><td>2017-11-10 08:20:00+0100</td></tr></table><p><b>Report Details</b></p><table class="grid"><tr><td><b>Code</b></td><td><b>Value</b></td><td><b>Note</b></td><td><b>When For</b></td></tr><tr><td><a href="Observation-hemoglobin.html"><span title="Codes: {http://loinc.org 17856-6}">Hemoglobin A1c/Hemoglobin.total in Blood by HPLC</span></a></td><td>7.5 %</td><td>Above stated goal of 7.0 %</td><td>2017-11-10 08:20:00+0100</td></tr></table></div>',
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0074",
                code: "LAB",
                display: "Laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11502-2",
              display: "Laboratory report",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2017-11-10",
        issued: "2017-11-10T08:20:00+01:00",
        performer: [
          {
            reference: "Organization/TII-Organization1",
            display: "Someplace General Hospital",
          },
        ],
        result: [
          {
            reference: "Observation/hemoglobin",
            display: "Above stated goal of 7.0 %",
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/DiagnosticReport/hemoglobin",
      },
    },
    {
      resource: {
        resourceType: "Specimen",
        id: "specimen-example-1",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Specimen-uv-ips"],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Specimen</b><a name="specimen-example-1"> </a><a name="hcspecimen-example-1"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Specimen &quot;specimen-example-1&quot; </p></div><p><b>type</b>: Urine specimen <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#122575003)</span></p><p><b>subject</b>: <a href="Patient-66033.html">Patient/66033</a> &quot; LUX-BRENNARD&quot;</p><h3>Collections</h3><table class="grid"><tr><td style="display: none">-</td><td><b>Method</b></td></tr><tr><td style="display: none">*</td><td>Urine specimen collection, clean catch <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#73416001)</span></td></tr></table></div>',
        },
        type: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "122575003",
              display: "Urine specimen",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        collection: {
          method: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "73416001",
                display: "Urine specimen collection, clean catch",
              },
            ],
          },
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Specimen/specimen-example-1",
      },
    },
    {
      resource: {
        resourceType: "ImagingStudy",
        id: "TII-ImagingStudy-5-1",
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: ImagingStudy</b><a name="TII-ImagingStudy-5-1"> </a><a name="hcTII-ImagingStudy-5-1"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource ImagingStudy &quot;TII-ImagingStudy-5-1&quot; </p></div><p><b>identifier</b>: <a href="http://terminology.hl7.org/5.5.0/NamingSystem-dui.html" title="An OID issued under DICOM OID rules. DICOM OIDs are represented as plain OIDs, with a prefix of &quot;urn:oid:&quot;. See https://www.dicomstandard.org/">DICOM Unique Id</a>/urn:oid:2.16.840.1.113883.2.9.999.1.12345</p><p><b>status</b>: available</p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07</a> &quot; HEIG&quot;</p><p><b>procedureCode</b>: SPECT Heart perfusion and wall motion at rest and W stress and W Tl-201 IV and W Tc-99m Sestamibi IV <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#49569-7)</span></p><p><b>reasonCode</b>: Chest pain, hypertension, type II diabetes mellitus. <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> ()</span></p><h3>Series</h3><table class="grid"><tr><td style="display: none">-</td><td><b>Uid</b></td><td><b>Modality</b></td><td><b>BodySite</b></td></tr><tr><td style="display: none">*</td><td>2.16.840.1.113883.2.9.999.2.12345</td><td>Nuclear Medicine (Details: DICOM code NM = \'Nuclear Medicine\', stated as \'Nuclear Medicine\')</td><td>Heart (Details: SNOMED CT code 80891009 = \'Heart\', stated as \'Heart\')</td></tr></table></div>',
        },
        identifier: [
          {
            system: "urn:dicom:uid",
            value: "urn:oid:2.16.840.1.113883.2.9.999.1.12345",
          },
        ],
        status: "available",
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        procedureCode: [
          {
            coding: [
              {
                system: "http://loinc.org",
                code: "49569-7",
                display:
                  "SPECT Heart perfusion and wall motion at rest and W stress and W Tl-201 IV and W Tc-99m Sestamibi IV",
              },
            ],
          },
        ],
        reasonCode: [
          {
            text: "Chest pain, hypertension, type II diabetes mellitus.",
          },
        ],
        series: [
          {
            uid: "2.16.840.1.113883.2.9.999.2.12345",
            modality: {
              system: "http://dicom.nema.org/resources/ontology/DCM",
              code: "NM",
              display: "Nuclear Medicine",
            },
            bodySite: {
              system: "http://snomed.info/sct",
              code: "80891009",
              display: "Heart",
            },
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/ImagingStudy/TII-ImagingStudy-5-1",
      },
    },
    {
      resource: {
        resourceType: "Practitioner",
        id: "eumfh-39-07",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Practitioner-uv-ips"],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Practitioner</b><a name="eumfh-39-07"> </a><a name="hceumfh-39-07"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Practitioner &quot;eumfh-39-07&quot; </p></div><p><b>name</b>: Mark Antonio </p></div>',
        },
        name: [
          {
            family: "Antonio",
            given: ["Mark"],
            prefix: ["Dr."],
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Practitioner/eumfh-39-07",
      },
    },
    {
      resource: {
        resourceType: "MedicationRequest",
        id: "eumfh-39-07-1-request",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationRequest-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: MedicationRequest</b><a name="eumfh-39-07-1-request"> </a><a name="hceumfh-39-07-1-request"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource MedicationRequest &quot;eumfh-39-07-1-request&quot; </p></div><p><b>status</b>: active</p><p><b>intent</b>: order</p><p><b>medication</b>: <a href="Medication-eumfh-39-07-1.html">Medication/eumfh-39-07-1: simvastatin</a></p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07: Alexander Heig (inject 39-07)</a> &quot; HEIG&quot;</p><blockquote><p><b>dosageInstruction</b></p><p><b>text</b>: 40 mg/day</p><p><b>timing</b>: Once per 1 days</p><blockquote><p><b>doseAndRate</b></p></blockquote></blockquote><h3>DispenseRequests</h3><table class="grid"><tr><td style="display: none">-</td><td><b>ValidityPeriod</b></td></tr><tr><td style="display: none">*</td><td>2021-01-01 --&gt; (ongoing)</td></tr></table></div>',
        },
        status: "active",
        intent: "order",
        medicationReference: {
          reference: "Medication/976d0804-cae0-45ae-afe3-a19f3ceba6bc",
          display: "simvastatin",
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
          display: "Alexander Heig (inject 39-07)",
        },
        dosageInstruction: [
          {
            text: "40 mg/day",
            doseAndRate: [
              {
                doseQuantity: {
                  value: 40,
                  unit: "mg",
                  system: "http://unitsofmeasure.org",
                  code: "mg",
                },
              },
            ],
          },
        ],
        dispenseRequest: {
          validityPeriod: {
            start: "2021-01-01",
          },
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/MedicationRequest/eumfh-39-07-1-request",
      },
    },
    {
      resource: {
        resourceType: "PractitionerRole",
        id: "simple-pr",
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: PractitionerRole</b><a name="simple-pr"> </a><a name="hcsimple-pr"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource PractitionerRole &quot;simple-pr&quot; </p></div><p><b>practitioner</b>: <a href="Practitioner-eumfh-39-07.html">Practitioner/eumfh-39-07</a> &quot; ANTONIO&quot;</p><p><b>organization</b>: <a href="Organization-simple-org.html">Organization/simple-org</a> &quot;Best Diagnostic Department&quot;</p></div>',
        },
        practitioner: {
          reference: "Practitioner/eumfh-39-07",
        },
        organization: {
          reference: "Organization/TII-Organization1",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/PractitionerRole/simple-pr",
      },
    },
    {
      resource: {
        resourceType: "Media",
        id: "media-example-smile",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Media-observation-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Media</b><a name="media-example-smile"> </a><a name="hcmedia-example-smile"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Media &quot;media-example-smile&quot; </p></div><p><b>status</b>: completed</p><p><b>type</b>: Image <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://hl7.org/fhir/R4/codesystem-media-type.html">Media Type</a>#image)</span></p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07</a> &quot; HEIG&quot;</p><p><b>created</b>: 2017-12-17</p><p><b>issued</b>: Dec 17, 2017, 2:56:18\u202fPM</p><p><b>operator</b>: <a href="Practitioner-eumfh-39-07.html">Practitioner/eumfh-39-07</a> &quot; ANTONIO&quot;</p><p><b>height</b>: 128</p><p><b>width</b>: 128</p><blockquote><p><b>content</b></p><blockquote><p><b>id</b></p>a1</blockquote><p><b>contentType</b>: image/png</p><p><b>data</b>: (base64 data - 1800 bytes)</p><p><b>creation</b>: 2017-12-17</p></blockquote></div>',
        },
        status: "completed",
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/media-type",
              code: "image",
              display: "Image",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        createdDateTime: "2017-12-17",
        issued: "2017-12-17T14:56:18Z",
        operator: {
          reference: "Practitioner/eumfh-39-07",
        },
        height: 128,
        width: 128,
        content: {
          id: "a1",
          creation: "2017-12-17",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Media/media-example-smile",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "alcohol-use-example",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-alcoholuse-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="alcohol-use-example"> </a><a name="hcalcohol-use-example"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;alcohol-use-example&quot; </p></div><p><b>status</b>: final</p><p><b>code</b>: Alcoholic drinks per day <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#74013-4)</span></p><p><b>subject</b>: <a href="Patient-patient-example-female.html">Patient/patient-example-female</a> &quot; DELAROSA&quot;</p><p><b>effective</b>: 2019-07-15</p><p><b>value</b>: 2 {wine glasses}/d<span style="background: LightGoldenRodYellow"> (Details: UCUM code {wine glasses}/d = \'{wine glasses}/d\')</span></p></div>',
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "74013-4",
              display: "Alcoholic drinks per day",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2019-07-15",
        valueQuantity: {
          value: 2,
          system: "http://unitsofmeasure.org",
          code: "{wine glasses}/d",
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/alcohol-use-example",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "pregnancy-edd-example",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="pregnancy-edd-example"> </a><a name="hcpregnancy-edd-example"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;pregnancy-edd-example&quot; </p></div><p><b>status</b>: final</p><p><b>code</b>: Delivery date Estimated <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#11778-8)</span></p><p><b>subject</b>: <a href="Patient-patient-example-female.html">Patient/patient-example-female</a> &quot; DELAROSA&quot;</p><p><b>effective</b>: 2020-01-10</p><p><b>value</b>: 2020-05-02</p></div>',
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11778-8",
              display: "Delivery date Estimated",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2020-01-10",
        valueDateTime: "2020-05-02",
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/pregnancy-edd-example",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "pregnancy-status-example",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-status-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="pregnancy-status-example"> </a><a name="hcpregnancy-status-example"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;pregnancy-status-example&quot; </p></div><p><b>status</b>: final</p><p><b>code</b>: Pregnancy status <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#82810-3)</span></p><p><b>subject</b>: <a href="Patient-patient-example-female.html">Patient/patient-example-female</a> &quot; DELAROSA&quot;</p><p><b>effective</b>: 2020-01-10</p><p><b>value</b>: Pregnant <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#LA15173-0)</span></p><p><b>hasMember</b>: <a href="Observation-pregnancy-edd-example.html">Observation/pregnancy-edd-example</a></p></div>',
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "82810-3",
              display: "Pregnancy status",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2020-01-10",
        valueCodeableConcept: {
          coding: [
            {
              system: "http://loinc.org",
              code: "LA15173-0",
              display: "Pregnant",
            },
          ],
        },
        hasMember: [
          {
            reference: "Observation/pregnancy-edd-example",
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/pregnancy-status-example",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "pathology-cancer",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-pathology-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Observation</b><a name="pathology-cancer"> </a><a name="hcpathology-cancer"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Observation &quot;pathology-cancer&quot; </p></div><p><b>status</b>: final</p><p><b>category</b>: Laboratory <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="http://terminology.hl7.org/5.5.0/CodeSystem-observation-category.html">Observation Category Codes</a>#laboratory)</span></p><p><b>code</b>: Estrogen receptor [Interpretation] in Tissue <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://loinc.org/">LOINC</a>#16112-5)</span></p><p><b>subject</b>: <a href="Patient-eumfh-39-07.html">Patient/eumfh-39-07</a> &quot; HEIG&quot;</p><p><b>effective</b>: 2020-04-22 19:20:00+0200</p><p><b>performer</b>: <a href="Organization-TII-Organization1.html">Organization/TII-Organization1</a> &quot;Someplace General Hospital&quot;</p><p><b>value</b>: Estrogen receptor positive tumor <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#416053008)</span></p><p><b>method</b>: Microscopy <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki"> (<a href="https://browser.ihtsdotools.org/">SNOMED CT</a>#117259009)</span></p></div>',
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "16112-5",
              display: "Estrogen receptor [Interpretation] in Tissue",
            },
          ],
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "2020-04-22T19:20:00+02:00",
        performer: [
          {
            reference: "Organization/TII-Organization1",
          },
        ],
        valueCodeableConcept: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "416053008",
              display: "Estrogen receptor positive tumor",
            },
          ],
        },
        method: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "117259009",
              display: "Microscopy",
            },
          ],
        },
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/pathology-cancer",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "ips-example-imaging-4",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml">\n\t\t\t<p>\n\t\t\t\t<b>date</b>: 1995-06-08\n            </p>\n\t\t\t<p>\n\t\t\t\t<b>subject</b>: <a>Patient/eumfh-39-07</a>\n\t\t\t</p>\n\t\t\t<p>\n\t\t\t\t<b>CT Abdomen W contrast IV</b>\n\t\t\t</p>\n\t\t\t<p>\n\t\t\t\t<b>Procedure Description:</b>Serial imaging was obtained in the upper abdomen with the administration of oral and intravenous contrast.</p>\n\t\t\t<p>\n\t\t\t\t<b>Finding:</b>The examination demonstrates a well circumscribed 3 cm lesion present within the medial aspect of the inferior right liver lobe. Initial evaluation demonstrates lack of contrast enhancement. Subsequent imaging (not shown) demonstrated typical contrast enhancement pattern of a benign hemangioma of the liver. The remaining contrast enhancement pattern in the liver is normal. There is normal appearance of the adrenal glands, spleen, kidneys, and pancreas. There is no evidence of liver metastasis.</p>\n\t\t\t<p>\n\t\t\t\t<b>Conclusion:</b>3 cm nodule present in the inferior medial aspect of right liver lobe. Contrast enhancement pattern consistent with the diagnosis of hemangioma.\n            </p>\n\t\t</div>',
        },
        partOf: [
          {
            reference: "ImagingStudy/TII-ImagingStudy-5-1",
          },
        ],
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "imaging",
                display: "Imaging",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "79103-8",
              display: "CT Abdomen W contrast IV",
            },
          ],
          text: "Upper abdomen with the administration of oral and intravenous contrast (example-4)",
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "1995-06-08",
        performer: [
          {
            reference: "Practitioner/eumfh-39-07",
          },
          {
            reference: "Organization/TII-Organization1",
          },
        ],
        valueString:
          "3 cm nodule present in the inferior medial aspect of right liver lobe. Contrast enhancement pattern consistent with the diagnosis of hemangioma.",
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://dicom.nema.org/resources/ontology/DCM",
                  code: "121065",
                  display: "Procedure Description",
                },
              ],
            },
            valueString:
              "Serial imaging was obtained in the upper abdomen with the administration of oral and intravenous contrast.",
          },
          {
            code: {
              coding: [
                {
                  system: "http://dicom.nema.org/resources/ontology/DCM",
                  code: "121071",
                  display: "Finding",
                },
              ],
            },
            valueString:
              "The examination demonstrates a well circumscribed 3 cm lesion present within the medial aspect of the inferior right liver lobe. Initial evaluation demonstrates lack of contrast enhancement. Subsequent imaging (not shown) demonstrated typical contrast enhancement pattern of a benign hemangioma of the liver. The remaining contrast enhancement pattern in the liver is normal. There is normal appearance of the adrenal glands, spleen, kidneys, and pancreas. There is no evidence of liver metastasis.",
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/ips-example-imaging-4",
      },
    },
    {
      resource: {
        resourceType: "Observation",
        id: "ips-example-imaging-1",
        meta: {
          profile: [
            "http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-radiology-uv-ips",
          ],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml">\n            <p>\n                <b>CT Abdomen W contrast IV</b>\n            </p>\n            <p>\n                <b>date</b>: 1995-06-08\n            </p>\n            <p>\n                <b>subject</b>:\n                <a>Patient/eumfh-39-07</a>\n            </p>\n            <p>\n                <b>value</b>: 3 cm nodule present in the inferior medial aspect of right liver lobe. Contrast enhancement pattern consistent with the diagnosis of hemangioma.\n            </p>\n        </div>',
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "imaging",
                display: "Imaging",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "79103-8",
              display: "CT Abdomen W contrast IV",
            },
          ],
          text: "Upper abdomen with the administration of oral and intravenous contrast (example-4)",
        },
        subject: {
          reference: "Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8",
        },
        effectiveDateTime: "1995-06-08",
        performer: [
          {
            reference: "Practitioner/eumfh-39-07",
          },
          {
            reference: "Organization/TII-Organization1",
          },
        ],
        valueString:
          "3 cm nodule present in the inferior medial aspect of right liver lobe. Contrast enhancement pattern consistent with the diagnosis of hemangioma.",
      },
      request: {
        method: "PUT",
        url: "/fhir/Observation/ips-example-imaging-1",
      },
    },
    {
      resource: {
        resourceType: "Organization",
        id: "TII-Organization1",
        meta: {
          profile: ["http://hl7.org/fhir/uv/ips/StructureDefinition/Organization-uv-ips"],
        },
        text: {
          status: "generated",
          div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative: Organization</b><a name="TII-Organization1"> </a><a name="hcTII-Organization1"> </a></p><div style="display: inline-block; background-color: #d9e0e7; padding: 6px; margin: 4px; border: 1px solid #8da1b4; border-radius: 5px; line-height: 60%"><p style="margin-bottom: 0px">Resource Organization &quot;TII-Organization1&quot; </p></div><p><b>name</b>: Someplace General Hospital</p><p><b>address</b>: 123 Street Address Sometown Somecountry </p></div>',
        },
        name: "Someplace General Hospital",
        address: [
          {
            line: ["123 Street Address"],
            city: "Sometown",
            country: "Somecountry",
          },
        ],
      },
      request: {
        method: "PUT",
        url: "/fhir/Organization/TII-Organization1",
      },
    },
  ],
};
