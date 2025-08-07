# Agentic FHIR Implementation Guide Development

This project demonstrates AI-assisted development of a FHIR Implementation Guide (IG) for Chilean healthcare systems using Claude Code. It showcases how agentic development can accelerate FHIR IG creation while maintaining best practices and quality standards.

## Key Features

- **Documentation-Driven Development**: Natural language markdown specifications automatically converted to FHIR resources
- **AI-Assisted Resource Generation**: Claude Code generates compliant FHIR resources from requirements
- **Integrated Testing Environment**: Local Aidbox FHIR server for real-time validation and testing
- **Comprehensive Test Suite**: HTTP-based automated testing for all resource types
- **Publication Ready**: Direct integration with HL7 FHIR IG Publisher



## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose - Container orchestration
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/setup) - Primary tool for AI-assisted IG development  
- [httpyac](https://httpyac.github.io/) - HTTP client for testing FHIR resources
- [HL7 FHIR IG Publisher](https://confluence.hl7.org/spaces/FHIR/pages/175618322/IG+Publisher+CLI) - Official FHIR IG publishing tool (`publisher.jar`) - put the publisher.jar in the ig-publisher directory
- [Aidbox](https://www.health-samurai.io/docs/aidbox/getting-started/run-aidbox-locally) - Local FHIR server for testing and validation

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Aidbox/examples.git 
   cd examples/agentic-coding-ig-development
   ```

2. **Start the FHIR server:**
   ```bash
   docker compose up -d
   ```

3. **Initialize Aidbox:**
   - Open http://localhost:8888 in your browser
   - Log in and initialize the instance with your Aidbox account
   - The [init bundle](https://www.health-samurai.io/docs/aidbox/configuration/init-bundle) automatically configures:
     - Basic authentication (`basic:secret`)
     - Access policies for DELETE operations and $sql queries

4. **Verify setup:**
   - FHIR Server: http://localhost:8080/fhir
   - Use authentication: `Basic basic:secret`

## Development Workflow

The project follows an AI-assisted development pattern using Claude Code's custom commands:

### 1. Resource Specification
Write requirements in natural language markdown files in the `src` directory.
Ask Claude to generate the FHIR resource for the definition in the markdown file.

```bash
claude  
> Generate FHIR resource for CSIdentidadGenero codesystem
```

### 2. Resource Generation & Testing  
Use Claude Code commands for iterative development:

**Test CodeSystems:**
```bash
claude
> /test-cs CSIdentidadGenero
```

**Test ValueSets:**
```bash
claude  
> /test-vs VSIdentidadGenero
```

**Test Profiles:**
```bash
claude
> /test-profile PatientChileno
```

### 3. Implementation Guide Publication
Generate and publish the complete IG:
```bash
claude
> /publish-ig
```

### 4. Review Published IG
View the final implementation guide:
```bash
claude  
> /view-ig
```

Each step validates resources against the FHIR specification and Chilean healthcare standards, ensuring quality before moving to the next phase.

## Project Structure

```
agentic-coding-ig-development/
├── .claude/                     # Claude Code configuration
│   ├── commands/               # Custom development commands
│   │   ├── publish-ig.md      # Publish IG using publisher.jar
│   │   ├── test-cs.md         # Test and validate CodeSystems
│   │   ├── test-profile.md    # Test and validate Profiles
│   │   ├── test-vs.md         # Test and validate ValueSets
│   │   └── view-ig.md         # View published IG in browser
│   └── settings.local.json    # Local Claude Code settings
├── CLAUDE.md                    # AI assistant configuration
├── README.md                    # Project documentation  
├── docker-compose.yaml          # FHIR server orchestration
├── src/                         # FHIR resource definitions
│   ├── CS/                     # CodeSystem resources
│   ├── VS/                     # ValueSet resources
│   └── Profiles/Extensions/    # Profile and Extension definitions
├── target/                     # Generated canonical resources (empty)
└── test/                       # HTTP-based test suite
    ├── CS/                     # CodeSystem tests
    ├── VS/                     # ValueSet tests
    └── *.http                  # Individual test files
```

## Custom Claude Code Commands

The `.claude/commands/` directory contains specialized commands for FHIR IG development:

| Command | Purpose |
|---------|---------|
| `/test-cs` | Validate CodeSystem resources against FHIR server |
| `/test-vs` | Validate ValueSet resources and expansion |
| `/test-profile` | Test StructureDefinition profiles with sample data |
| `/publish-ig` | Generate complete IG using HL7 FHIR Publisher |
| `/view-ig` | Open published IG in browser for review |

## AI Assistant Configuration

The `CLAUDE.md` file provides project context to Claude Code, including:
- **FHIR Standards**: Resource patterns and validation requirements
- **Chilean Healthcare Context**: Local terminology and regulatory compliance  
- **Development Workflow**: Testing protocols and quality gates
- **Canonical URLs**: Standardized `https://interoperability.testcompany.cl/` namespace
- **Architecture Patterns**: Resource organization and naming conventions

This configuration ensures consistent AI-assisted development aligned with FHIR best practices and project requirements.
