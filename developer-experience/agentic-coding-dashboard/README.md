---
features: [FHIR Dashboard, AI assisted, Claude Code, SQL on FHIR, Chart.js, Bun, TypeScript]
languages: [TypeScript]
---
# Agentic Coding: FHIR Patient Dashboard

Building healthcare dashboards on top of FHIR data typically requires significant boilerplate: mapping FHIR resources to SQL, setting up charting libraries, and wiring everything together.

This project demonstrates how **Claude Code can build a complete patient dashboard from a single prompt**, using Aidbox FHIR Server's [SQL on FHIR](https://build.fhir.org/ig/FHIR/sql-on-fhir-v2/) ViewDefinitions to flatten FHIR resources into queryable SQL tables, and Chart.js to visualize the data.

The dashboard shows a list of patients with drill-down detail pages, including a body weight trend chart powered by materialized ViewDefinitions.


## Key Features

- **SQL on FHIR ViewDefinitions**: Declarative mapping from FHIR Observations to flat SQL tables
- **Direct SQL Queries**: `Bun.SQL` queries against materialized views in the `sof` schema
- **Chart.js Visualizations**: Interactive line charts showing body weight trends over time
- **FHIR API Integration**: Patient and Observation data fetched via `@health-samurai/aidbox-client`
- **AI-Assisted Development**: Dashboard features built entirely through Claude Code prompts using the `/aidbox-dashboard` skill


## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and toolkit
- [Docker](https://www.docker.com/) and Docker Compose - Container orchestration
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/setup) - AI-assisted development tool
- [Aidbox](https://www.health-samurai.io/docs/aidbox/getting-started/run-aidbox-locally) - Local FHIR server


## Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Aidbox/examples.git
   cd examples/developer-experience/agentic-coding-dashboard
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start the FHIR server:**
   ```bash
   docker compose up
   ```

4. **Initialize Aidbox:**
   - Open http://localhost:8080 in your browser
   - Log in and initialize the instance with your Aidbox account
   - The [init bundle](https://www.health-samurai.io/docs/aidbox/configuration/init-bundle) automatically configures:
     - Client with Basic authentication (`basic:secret`)
     - Access policies for the client
     - Body weight ViewDefinition (with automatic materialization)

5. **Seed sample data:**
   ```bash
   bun run seed
   ```

6. **Start the dashboard App:**
   ```bash
   bun run dev
   ```

7. **Open the dashboard App** at http://localhost:3000


## Project Structure

```
agentic-coding-dashboard/
├── .claude/                            # Claude Code configuration
│   └── skills/
│       └── aidbox-dashboard/           # Dashboard development skill
│           └── SKILL.md
├── CLAUDE.md                           # Claude Code main configuration
├── README.md                           # Project documentation
├── docker-compose.yaml                 # Aidbox + PostgreSQL
├── package.json
├── tsconfig.json
├── init-bundle.json                    # Generated bundle (do not edit)
├── fhir/
│   └── definitions/                    # FHIR resource definitions
│       ├── access-control/
│       │   ├── 01-client.json          # Basic auth client
│       │   └── 02-access-policy.json   # Access policy
│       └── view-definitions/
│           └── 01-body-weight.json     # Body weight ViewDefinition
├── scripts/
│   ├── build-init-bundle.ts            # Build, upload & materialize
│   ├── generate-types.ts               # FHIR type generation config
│   └── seed.ts                         # Seed sample patient data
└── src/
    ├── index.ts                        # Web server, routes & charts
    ├── aidbox.ts                       # AidboxClient instance
    └── fhir-types/                     # Auto-generated FHIR types
```


## How It Works

### 1. ViewDefinitions flatten FHIR into SQL

A [ViewDefinition](fhir/definitions/view-definitions/01-body-weight.json) declaratively maps FHIR Observation resources (filtered by LOINC code `29463-7` for body weight) into a flat SQL table:

```
sof.body_weight
├── id              (Observation ID)
├── patient_id      (referenced Patient ID)
├── effective_date  (observation date)
├── weight_kg       (quantity value)
├── unit            (quantity unit)
└── status          (observation status)
```

### 2. Materialize creates the SQL table

Running `bun run build:init-bundle --upload` uploads the ViewDefinition to Aidbox and calls `$materialize`, which creates a real SQL table in the `sof` schema populated with data from matching FHIR resources.

### 3. The app queries SQL directly

The dashboard uses `Bun.SQL` to query the materialized `sof.body_weight` table directly, bypassing the FHIR API for efficient tabular access:

```ts
const rows = await db.unsafe(
  `SELECT effective_date, weight_kg, unit
   FROM sof.body_weight
   WHERE patient_id = $1
   ORDER BY effective_date`,
  [patientId],
);
```

### 4. Chart.js renders the visualization

Body weight data is passed to a Chart.js line chart, showing each patient's weight trend over time with interactive tooltips.


## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload (port 3000) |
| `bun run build:init-bundle` | Rebuild `init-bundle.json` from definitions |
| `bun run build:init-bundle --upload` | Rebuild, upload to Aidbox & materialize views |
| `bun run seed` | Seed sample data (2 patients, 20 observations) |
| `bun run generate-types` | Regenerate FHIR TypeScript types |


## Development with Claude Code

This project includes a custom `/aidbox-dashboard` skill that teaches Claude Code how to add new dashboard features. To add a new chart or view:

```bash
claude
> /aidbox-dashboard Add a blood pressure chart to the patient detail page
```

Claude Code will:
1. Create a new ViewDefinition in `fhir/definitions/view-definitions/`
2. Run `bun run build:init-bundle --upload` to materialize it
3. Add the SQL query and Chart.js visualization to `src/index.ts`
4. Verify the result end-to-end


## AI Assistant Configuration

The [CLAUDE.md](CLAUDE.md) file provides Claude Code with full context about the project structure, Aidbox client usage, FHIR type generation, and available commands. The [skill definition](.claude/skills/aidbox-dashboard/SKILL.md) provides step-by-step instructions for the SQL on FHIR dashboard workflow.
