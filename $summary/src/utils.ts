import { randomUUID } from "node:crypto";

const narrativeTemplate = `<div xmlns="http://www.w3.org/1999/xhtml">
<p><b>Generated Narrative</b></p>
<div
  style="
    display: inline-block;
    background-color: #d9e0e7;
    padding: 6px;
    margin: 4px;
    border: 1px solid #8da1b4;
    border-radius: 5px;
    line-height: 60%;
  "
>
  <p style="margin-bottom: 0px">Resource "{{compositionId}}"</p>
</div>
<p><b>status</b>: {{compositionStatus}}</p>
<p>
  <b>type</b>: Patient summary Document
  <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki">
    (<a href="https://loinc.org/">LOINC</a>#60591-5)</span
  >
</p>
<p><b>date</b>: 2020-12-11 02:30:00+0100</p>
<p><b>author</b>: Device Aidbox</p>
<p><b>title</b>: {{compositionTitle}}</p>
<h3>Events</h3>
<table class="grid">
  <tr>
    <td>-</td>
    <td><b>Code</b></td>
    <td><b>Period</b></td>
  </tr>
  <tr>
    <td>*</td>
    <td>
      care provision
      <span style="background: LightGoldenRodYellow; margin: 4px; border: 1px solid khaki">
        (<a href="http://terminology.hl7.org/CodeSystem/v3-ActClass">ActClass</a>#PCPR)</span
      >
    </td>
    <td>?? --&gt; {{compositionEventDate}}</td>
  </tr>
</table>
</div>`;

const generateNarrative = ({
  id,
  status,
  title,
  eventDate,
}: {
  id: string;
  status: string;
  title: string;
  eventDate: string;
}) => ({
  status: "generated",
  div: narrativeTemplate
    .replace("{{compositionId}}", id)
    .replace("{{compositionStatus}}", status)
    .replace("{{compositionTitle}}", title)
    .replace("{{compositionEventDate}}", eventDate),
});

export const createComposition = (data: any, patientId: string) => {
  const now = new Date();
  const medicationResources = [
    "MedicationStatement",
    "MedicationRequest",
    "MedicationAdministration",
    "MedicationDispense",
  ];

  const narrative = {
    resourceType: "Composition",
    id: randomUUID(),
    date: now.toISOString(),
    status: "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "60591-5",
          display: "Patient summary Document",
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    author: [
      {
        display: "Aidbox",
        type: "Device",
      },
    ],
    title: `Patient Summary as of ${now.toString()}`,
    event: [
      {
        code: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActClass",
                code: "PCPR",
              },
            ],
          },
        ],
        period: {
          end: now.toISOString(),
        },
      },
    ],
    section: [
      {
        title: "Active Problems",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11450-4",
              display: "Problem list Reported",
            },
          ],
        },
        entry: data.reduce((acc: any, item: any) => {
          if (item.resource.resourceType === "Condition") {
            acc.push({
              reference: `Condition/${item.resource.id}`,
            });
          }
          return acc;
        }, []),
      },
      {
        title: "Medication",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "10160-0",
              display: "History of Medication use Narrative",
            },
          ],
        },
        entry: data.reduce((acc: any, item: any) => {
          if (medicationResources.includes(item.resource.resourceType)) {
            acc.push({
              reference: `${item.resource.resourceType}/${item.resource.id}`,
            });
          }
          return acc;
        }, []),
      },
      {
        title: "Allergies and Intolerances",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "48765-2",
              display: "Allergies and adverse reactions Document",
            },
          ],
        },
        entry: data.reduce((acc: any, item: any) => {
          if (item.resource.resourceType === "AllergyIntolerance") {
            acc.push({
              reference: `AllergyIntolerance/${item.resource.id}`,
            });
          }
          return acc;
        }, []),
      },
    ],
  };

  return {
    ...narrative,
    text: generateNarrative({
      id: narrative.id,
      status: narrative.status,
      title: narrative.title,
      eventDate: narrative.event[0].period.end,
    }),
  };
};
