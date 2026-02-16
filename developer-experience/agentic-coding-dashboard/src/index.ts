import { SQL } from "bun";
import { aidbox } from "./aidbox";
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import type { Observation } from "./fhir-types/hl7-fhir-r4-core/Observation";
import type { Bundle } from "./fhir-types/hl7-fhir-r4-core/Bundle";

const db = new SQL({
  url: "postgresql://aidbox:KYRMNQSitF@localhost:5432/aidbox",
});

let chartIdCounter = 0;

interface BodyWeightRow {
  effective_date: string;
  weight_kg: number;
  unit: string;
}

function formatPatientName(patient: Patient): string {
  const name = patient.name?.[0];
  if (!name) return "Unknown";
  const given = name.given?.join(" ") ?? "";
  const family = name.family ?? "";
  return `${given} ${family}`.trim() || "Unknown";
}

function formatObservationValue(obs: Observation): string {
  if (obs.valueQuantity) {
    return `${obs.valueQuantity.value ?? ""} ${obs.valueQuantity.unit ?? ""}`.trim();
  }
  if (obs.valueString) return obs.valueString;
  if (obs.valueCodeableConcept) {
    return obs.valueCodeableConcept.coding?.[0]?.display ?? obs.valueCodeableConcept.text ?? "";
  }
  if (obs.valueBoolean !== undefined) return String(obs.valueBoolean);
  if (obs.valueInteger !== undefined) return String(obs.valueInteger);
  if (obs.valueDateTime) return obs.valueDateTime;
  return "-";
}

function Layout({ title, children }: { title: string; children: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 960px; margin: 0 auto; padding: 20px; }
    h1 { margin-bottom: 20px; color: #1a1a1a; }
    h2 { margin-bottom: 16px; color: #1a1a1a; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-male { background: #dbeafe; color: #1d4ed8; }
    .badge-female { background: #fce7f3; color: #be185d; }
    .badge-other { background: #e5e7eb; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 600; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:last-child td { border-bottom: none; }
    .detail-grid { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; }
    .detail-label { font-weight: 600; color: #6b7280; font-size: 14px; }
    .detail-value { font-size: 14px; }
    .nav { margin-bottom: 16px; font-size: 14px; }
    .empty { color: #9ca3af; font-style: italic; padding: 20px 0; text-align: center; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-final { background: #d1fae5; color: #065f46; }
    .status-preliminary { background: #fef3c7; color: #92400e; }
    .status-registered { background: #e0e7ff; color: #3730a3; }
    .status-amended { background: #fce7f3; color: #be185d; }
    .status-other { background: #e5e7eb; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    ${children}
  </div>
</body>
</html>`;
}

function PatientList({ patients }: { patients: Patient[] }) {
  if (patients.length === 0) {
    return `<div class="empty">No patients found</div>`;
  }

  const rows = patients
    .map((p) => {
      const name = formatPatientName(p);
      const genderClass = p.gender === "male" ? "badge-male" : p.gender === "female" ? "badge-female" : "badge-other";
      return `<tr>
        <td><a href="/patients/${p.id}">${name}</a></td>
        <td><span class="badge ${genderClass}">${p.gender ?? "unknown"}</span></td>
        <td>${p.birthDate ?? "-"}</td>
        <td>${p.id ?? ""}</td>
      </tr>`;
    })
    .join("");

  return `<div class="card">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Gender</th>
          <th>Birth Date</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function ObservationTable({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return `<div class="empty">No observations found for this patient</div>`;
  }

  const rows = observations
    .map((obs) => {
      const code = obs.code?.coding?.[0]?.display ?? obs.code?.text ?? "-";
      const value = formatObservationValue(obs);
      const status = obs.status;
      const statusClass =
        status === "final" ? "status-final" :
        status === "preliminary" ? "status-preliminary" :
        status === "registered" ? "status-registered" :
        status === "amended" ? "status-amended" : "status-other";
      const date = obs.effectiveDateTime ?? obs.effectivePeriod?.start ?? "-";
      return `<tr>
        <td>${code}</td>
        <td>${value}</td>
        <td><span class="status ${statusClass}">${status}</span></td>
        <td>${date}</td>
      </tr>`;
    })
    .join("");

  return `<div class="card">
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Value</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function BodyWeightChart({ data }: { data: BodyWeightRow[] }) {
  if (data.length === 0) {
    return `<div class="empty">No body weight data found</div>`;
  }

  const chartId = `body-weight-chart-${++chartIdCounter}`;
  const labels = JSON.stringify(data.map((d) => d.effective_date));
  const values = JSON.stringify(data.map((d) => d.weight_kg));
  const unit = data[0].unit ?? "kg";

  return `<div class="card">
    <canvas id="${chartId}"></canvas>
    <script>
      new Chart(document.getElementById('${chartId}'), {
        type: 'line',
        data: {
          labels: ${labels},
          datasets: [{
            label: 'Body Weight',
            data: ${values},
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.parsed.y + ' ${unit}'
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Date' }, grid: { display: false } },
            y: { title: { display: true, text: 'Weight (${unit})' }, grace: '5%' }
          }
        }
      });
    </script>
  </div>`;
}

function html(body: string): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const patientDetailPattern = new URLPattern({ pathname: "/patients/:id" });

async function handleIndex(): Promise<Response> {
  const result = await aidbox.searchType({
    type: "Patient",
    query: [["_count", "50"], ["_sort", "-_lastUpdated"]],
  });

  let patients: Patient[] = [];
  if (result.isOk()) {
    const bundle = result.value.resource as Bundle;
    patients = (bundle.entry ?? [])
      .map((e) => e.resource as Patient)
      .filter(Boolean);
  }

  return html(Layout({
    title: "Patients",
    children: `
      <h1>Patients</h1>
      ${PatientList({ patients })}
    `,
  }));
}

async function handlePatientDetail(id: string): Promise<Response> {
  const patientResult = await aidbox.read<Patient>({
    type: "Patient",
    id,
  });

  if (patientResult.isErr()) {
    return html(Layout({
      title: "Patient Not Found",
      children: `
        <div class="nav"><a href="/">&larr; Back to patients</a></div>
        <div class="card"><div class="empty">Patient not found</div></div>
      `,
    }));
  }

  const patient = patientResult.value.resource;
  const name = formatPatientName(patient);

  const obsResult = await aidbox.searchType({
    type: "Observation",
    query: [
      ["subject", `Patient/${id}`],
      ["_count", "10"],
      ["_sort", "-date"],
    ],
  });

  let observations: Observation[] = [];
  if (obsResult.isOk()) {
    const bundle = obsResult.value.resource as Bundle;
    observations = (bundle.entry ?? [])
      .map((e) => e.resource as Observation)
      .filter(Boolean);
  }

  const genderClass = patient.gender === "male" ? "badge-male" : patient.gender === "female" ? "badge-female" : "badge-other";

  const bodyWeightData = await db.unsafe(
    `SELECT effective_date, weight_kg, unit FROM sof.body_weight WHERE patient_id = $1 ORDER BY effective_date`,
    [id],
  ) as unknown as BodyWeightRow[];

  return html(Layout({
    title: `Patient: ${name}`,
    children: `
      <div class="nav"><a href="/">&larr; Back to patients</a></div>
      <h1>${name}</h1>
      <div class="card">
        <div class="detail-grid">
          <div class="detail-label">ID</div>
          <div class="detail-value">${patient.id ?? "-"}</div>
          <div class="detail-label">Gender</div>
          <div class="detail-value"><span class="badge ${genderClass}">${patient.gender ?? "unknown"}</span></div>
          <div class="detail-label">Birth Date</div>
          <div class="detail-value">${patient.birthDate ?? "-"}</div>
          <div class="detail-label">Active</div>
          <div class="detail-value">${patient.active !== undefined ? String(patient.active) : "-"}</div>
          <div class="detail-label">Phone</div>
          <div class="detail-value">${patient.telecom?.find((t) => t.system === "phone")?.value ?? "-"}</div>
          <div class="detail-label">Email</div>
          <div class="detail-value">${patient.telecom?.find((t) => t.system === "email")?.value ?? "-"}</div>
        </div>
      </div>
      <h2>Body Weight Over Time</h2>
      ${BodyWeightChart({ data: bodyWeightData })}
      <h2>Observations (latest 10)</h2>
      ${ObservationTable({ observations })}
    `,
  }));
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return handleIndex();
    }

    const match = patientDetailPattern.exec(req.url);
    if (match) {
      return handlePatientDetail(match.pathname.groups.id!);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Dashboard running at http://localhost:${server.port}`);
