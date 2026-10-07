// Imports the data view, panels and dashboard into Kibana via the saved
// objects API. Idempotent: re-running overwrites by id.
//
// Panels aggregate on the flat roll-up fields (requestor_id, patient_refs, ...)
// because Lens cannot aggregate on the nested agent/entity arrays.

const KIBANA = process.env.KIBANA_URL ?? "http://localhost:5601";
const DATA_VIEW = "aidbox-audit-events";
const DASHBOARD = "aidbox-audit-dashboard";

// ---------- Lens column builders ----------

type Column = Record<string, unknown>;

const count = (label: string): Column => ({
  label, customLabel: true, operationType: "count", sourceField: "___records___",
  dataType: "number", isBucketed: false, scale: "ratio", params: { emptyAsNull: false },
});

const uniqueCount = (field: string, label: string): Column => ({
  label, customLabel: true, operationType: "unique_count", sourceField: field,
  dataType: "number", isBucketed: false, scale: "ratio", params: { emptyAsNull: false },
});

const lastSeen = (label: string): Column => ({
  label, customLabel: true, operationType: "max", sourceField: "recorded",
  dataType: "date", isBucketed: false, scale: "ratio",
});

const timeline = (): Column => ({
  label: "recorded", operationType: "date_histogram", sourceField: "recorded",
  dataType: "date", isBucketed: true, scale: "interval",
  params: { interval: "auto", includeEmptyRows: true, dropPartials: false },
});

const terms = (field: string, label: string, orderBy: string, size = 10, otherBucket = true): Column => ({
  label, customLabel: true, operationType: "terms", sourceField: field,
  dataType: "string", isBucketed: true, scale: "ordinal",
  params: {
    size, otherBucket, missingBucket: false,
    orderBy: { type: "column", columnId: orderBy }, orderDirection: "desc",
    parentFormat: { id: "terms" },
  },
});

// ---------- Lens saved object ----------

function lens(
  id: string,
  title: string,
  visualizationType: string,
  columns: Record<string, Column>,
  visualization: Record<string, unknown>,
  query = "",
) {
  return {
    type: "lens",
    id,
    attributes: {
      title,
      description: "",
      visualizationType,
      state: {
        datasourceStates: {
          formBased: {
            layers: {
              layer: { columns, columnOrder: Object.keys(columns), incompleteColumns: {} },
            },
          },
        },
        visualization: { layerId: "layer", layerType: "data", ...visualization },
        query: { query, language: "kuery" },
        filters: [],
        adHocDataViews: {},
        internalReferences: [],
      },
    },
    references: [
      { type: "index-pattern", id: DATA_VIEW, name: "indexpattern-datasource-layer-layer" },
    ],
  };
}

const metric = (id: string, title: string, column: Column, query = "") =>
  lens(id, title, "lnsMetric", { value: column }, { metricAccessor: "value" }, query);

const xy = (
  id: string,
  title: string,
  seriesType: string,
  columns: Record<string, Column>,
  x: string,
  y: string,
  split?: string,
  query = "",
) =>
  lens(id, title, "lnsXY", columns, {
    legend: { isVisible: !!split, position: "right" },
    valueLabels: "hide",
    preferredSeriesType: seriesType,
    axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
    layers: [{
      layerId: "layer", layerType: "data", seriesType, position: "top",
      showGridlines: false, xAccessor: x, accessors: [y],
      ...(split && { splitAccessor: split }),
    }],
  }, query);

const table = (id: string, title: string, columns: Record<string, Column>) =>
  lens(id, title, "lnsDatatable", columns, {
    columns: Object.keys(columns).map((columnId) => ({ columnId })),
  });

// ---------- objects ----------

const dataView = {
  type: "index-pattern",
  id: DATA_VIEW,
  attributes: {
    title: "auditevent-*",
    name: "Aidbox audit events",
    timeFieldName: "recorded",
  },
  references: [],
};

const panels = [
  // KPI row
  metric("audit-kpi-events", "Audit events", count("Audit events")),
  metric("audit-kpi-patients", "Patients accessed", uniqueCount("patient_refs", "Patients accessed")),
  metric("audit-kpi-clients", "Active clients", uniqueCount("requestor_id", "Active clients")),
  metric(
    "audit-kpi-writes", "Writes (create / update / delete)", count("Writes"),
    "subtype_codes : (create or update or delete or patch)",
  ),

  xy("audit-timeline", "Events over time by interaction", "bar_stacked", {
    time: timeline(),
    interaction: terms("subtype_codes", "Interaction", "events", 8),
    events: count("Events"),
  }, "time", "events", "interaction"),

  // Who opens patient charts. In the demo, lab-integration should be absent.
  xy("audit-patient-reads-per-client", "Patient records read, per client", "bar_horizontal", {
    client: terms("requestor_id", "Client", "patients", 10, false),
    patients: uniqueCount("patient_refs", "Distinct patients read"),
  }, "client", "patients", undefined, "entity_types : Patient and subtype_codes : (read or vread or history)"),

  xy("audit-resource-types", "Events by resource type", "bar_horizontal", {
    type: terms("entity_types", "Resource type", "events", 10),
    events: count("Events"),
  }, "type", "events"),

  table("audit-top-patients", "Most accessed patients", {
    patient: terms("patient_refs", "Patient", "events", 15, false),
    events: count("Events"),
    clients: uniqueCount("requestor_id", "Clients"),
    last: lastSeen("Last access"),
  }),

  table("audit-client-activity", "Client activity", {
    client: terms("requestor_id", "Client", "events", 15, false),
    events: count("Events"),
    patients: uniqueCount("patient_refs", "Patients"),
    addresses: uniqueCount("requestor_address", "Source IPs"),
    last: lastSeen("Last seen"),
  }),
];

const recentEvents = {
  type: "search",
  id: "audit-recent-events",
  attributes: {
    title: "Recent audit events",
    columns: ["requestor_id", "subtype_codes", "entity_what", "patient_refs", "search_queries", "requestor_address"],
    sort: [["recorded", "desc"]],
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({
        query: { query: "", language: "kuery" },
        filter: [],
        indexRefName: "kibanaSavedObjectMeta.searchSourceJSON.index",
      }),
    },
  },
  references: [
    { type: "index-pattern", id: DATA_VIEW, name: "kibanaSavedObjectMeta.searchSourceJSON.index" },
  ],
};

// 48-column grid.
const layout: [id: string, x: number, y: number, w: number, h: number][] = [
  ["audit-kpi-events", 0, 0, 12, 6],
  ["audit-kpi-patients", 12, 0, 12, 6],
  ["audit-kpi-clients", 24, 0, 12, 6],
  ["audit-kpi-writes", 36, 0, 12, 6],
  ["audit-timeline", 0, 6, 48, 13],
  ["audit-patient-reads-per-client", 0, 19, 24, 12],
  ["audit-resource-types", 24, 19, 24, 12],
  ["audit-top-patients", 0, 31, 24, 15],
  ["audit-client-activity", 24, 31, 24, 15],
  ["audit-recent-events", 0, 46, 48, 18],
];

const typeOf = (id: string) => (id === recentEvents.id ? "search" : "lens");

// Filter controls: answer "who touched patient X" / "what did client Y do".
const control = (order: number, fieldName: string, title: string) => ({
  order, width: "medium", grow: true, type: "optionsListControl",
  explicitInput: { id: `ctl-${fieldName}`, dataViewId: DATA_VIEW, fieldName, title, selectedOptions: [] },
});

const dashboard = {
  type: "dashboard",
  id: DASHBOARD,
  attributes: {
    title: "Aidbox audit events",
    description: "BALP AuditEvents from Aidbox's AuditEventsR4BALP topic, indexed by the Bun ingestor",
    timeRestore: true,
    timeFrom: "now-15m",
    timeTo: "now",
    refreshInterval: { pause: false, value: 30000 },
    optionsJSON: JSON.stringify({ useMargins: true, syncColors: true, syncCursor: true, syncTooltips: false, hidePanelTitles: false }),
    panelsJSON: JSON.stringify(
      layout.map(([id, x, y, w, h], i) => ({
        type: typeOf(id),
        panelIndex: `p${i}`,
        gridData: { x, y, w, h, i: `p${i}` },
        // Metric tiles carry their own title; a panel title would repeat it.
        embeddableConfig: id.startsWith("audit-kpi-") ? { hidePanelTitles: true } : {},
        panelRefName: `panel_p${i}`,
      })),
    ),
    controlGroupInput: {
      controlStyle: "oneLine",
      chainingSystem: "HIERARCHICAL",
      ignoreParentSettingsJSON: JSON.stringify({ ignoreFilters: false, ignoreQuery: false, ignoreTimerange: false, ignoreValidations: false }),
      panelsJSON: JSON.stringify({
        "ctl-requestor_id": control(0, "requestor_id", "Client"),
        "ctl-patient_refs": control(1, "patient_refs", "Patient"),
        "ctl-subtype_codes": control(2, "subtype_codes", "Interaction"),
      }),
    },
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({ query: { query: "", language: "kuery" }, filter: [] }),
    },
  },
  references: layout.map(([id], i) => ({ name: `p${i}:panel_p${i}`, type: typeOf(id), id })),
};

// ---------- import ----------

// Objects are written in the 8.x shape. Stamping that version makes Kibana
// run only the migrations from 8.x onward; without it Kibana assumes 7.x
// documents and fails on fields that did not exist yet.
const MIGRATED_FROM: Record<string, string> = {
  "index-pattern": "8.0.0",
  lens: "8.9.0",
  search: "8.0.0",
  dashboard: "8.9.0",
};

const objects = [dataView, ...panels, recentEvents, dashboard].map((o) => ({
  ...o,
  coreMigrationVersion: "8.8.0",
  typeMigrationVersion: MIGRATED_FROM[o.type],
}));
const ndjson = objects.map((o) => JSON.stringify(o)).join("\n") + "\n";

const form = new FormData();
form.append("file", new Blob([ndjson]), "aidbox-audit.ndjson");

const res = await fetch(`${KIBANA}/api/saved_objects/_import?overwrite=true`, {
  method: "POST",
  headers: { "kbn-xsrf": "true" },
  body: form,
});
const body = (await res.json()) as { success?: boolean; successCount?: number; errors?: unknown[] };

if (!res.ok || !body.success) {
  console.error(`import failed (${res.status}):`, JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log(`imported ${body.successCount} saved objects`);
console.log(`dashboard: ${process.env.KIBANA_PUBLIC_URL ?? "http://localhost:5601"}/app/dashboards#/view/${DASHBOARD}`);

export {};
