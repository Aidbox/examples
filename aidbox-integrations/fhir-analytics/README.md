---
features: [Analytics, Metabase, SQL on FHIR, Data visualization, Risk assessment]
languages: [YAML]
---
# FHIR Analytics with Aidbox and Metabase

Use SQL on FHIR on sample risk assessment form with Aidbox and visualize data with Metabase.

## Prerequisites

1. Docker
2. Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
3. Working directory: `fhir-analytics`

```
git clone https://github.com/Aidbox/examples.git
cd examples/fhir-analytics
```

## Run Aidbox and Metabase

Use docker compose to start Aidbox and Metabase:

```sh
docker compose up
```

## Open Aidbox Notebook

Go to [Aidbox console](http://localhost:8080/ui/console#/). Navigate to **Notebooks** in the sidebar.
Open "SQL on FHIR: Analytics on form data" notebook.

## Follow guide in the Notebook
The "SQL on FHIR: Analytics on form data" notebook is a step-by-step guide which shows how
to use SQL on FHIR to make analytical queries much simplier.

## Open Metabase
Navigate to [Metabase](http://localhost:3000). Follow instruction to set up account, then connect
data source.

To connect data source use the following values:
- host: `aidbox-db`,
- port: 5432,
- database: `aidbox`,
- user: `aidbox`,
- password: `password`.

Then use view from the `sof` schema to make visualizations.
