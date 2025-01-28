import { SimpleNarrativeEntry } from "./types";

const compositionNarrativeTemplate = `<div xmlns="http://www.w3.org/1999/xhtml">
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
    (<a href="https://loinc.org/">LOINC</a>#60591-5)
  </span>
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
        (<a href="http://terminology.hl7.org/CodeSystem/v3-ActClass">ActClass</a>#PCPR)</span>
    </td>
    <td>?? --&gt; {{compositionEventDate}}</td>
  </tr>
</table>
</div>`;

const simpleNarrativeTemplate = `<div xmlns=\"http://www.w3.org/1999/xhtml\">{{info}}</div>`;
const simpleNoInfoNarrativeTemplate = `<div xmlns='http://www.w3.org/1999/xhtml'>There is no information available about the subject's health problems or disabilities.</div>`;

export const generateCompositionNarrative = ({
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
  div: compositionNarrativeTemplate
    .replace("{{compositionId}}", id)
    .replace("{{compositionStatus}}", status)
    .replace("{{compositionTitle}}", title)
    .replace("{{compositionEventDate}}", eventDate),
});

export const generateSimpleNarrative = (resources: SimpleNarrativeEntry) => {
  const info = resources.reduce((acc: string[], { resource }) => {
    const display =
      resource.resourceType === "Immunization"
        ? resource.vaccineCode?.coding?.[0].display
        : resource.code?.coding?.[0].display;

    if (display) {
      acc.push(display);
    }
    return acc;
  }, []);
  const narrative =
    info.length > 0
      ? simpleNarrativeTemplate.replace(
          "{{info}}",
          info.map((item) => `<div>${item}</div>`).join("")
        )
      : simpleNoInfoNarrativeTemplate;

  return {
    status: "generated",
    div: narrative,
  };
};
