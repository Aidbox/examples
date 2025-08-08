# Agentic FHIR Implementation Guide Development

Traditional FHIR Implementation Guide development is complex and time-consuming. Creating and validating FHIR StructureDefinition resources and terminology resources requires deep technical expertise, which led to the development of additional tooling like the FSH (FHIR Shorthand) language.

With the advent of Large Language Models, we can now explore a different approach: **describing all profiles, code systems, and value sets in natural language and having an LLM generate the complete Implementation Guide from those descriptions.**

This project demonstrates how the Aidbox FHIR Server enables LLMs to immediately test and validate each generated resource, creating a seamless AI-assisted development workflow for FHIR Implementation Guides.


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
   - Open http://localhost:8080 in your browser
   - Log in and initialize the instance with your Aidbox account
   - The [init bundle](https://www.health-samurai.io/docs/aidbox/configuration/init-bundle) automatically configures:
     - Client with Basic authentication (`basic:secret`)
     - Access policies for the client
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

## Development Workflow

### 1. Generation of the FHIR Resources from the MD definitions.

Write requirements in natural language markdown files in the `src` directory.

Couple of examples: 
- CodeSystem definition [CSIdentidadGenero](src/CS/CSIdentidadGenero.MD)
- ValueSet definition [VSIdentidadGenero](src/VS/VSIdentidadGenero.MD)
- Profile definition [PacienteCl](src/Profiles/Resources/PacienteCl.MD)

Ask Claude to generate the FHIR resource for the definition in the markdown file.


```bash
claude  
> Generate FHIR resource for CSIdentidadGenero codesystem
```

Check the generated resources in the `target` directory.
Couple of examples: 
- CodeSystem definition [CSIdentidadGenero](target/CSIdentidadGenero.json)
- ValueSet definition [VSIdentidadGenero](target/VSIdentidadGenero.json)
- Profile definition [PacienteCl](target/PacienteCl.json)


### 2. Resource Testing  
We need to **test** the generated resources and it's very easy to do that with Aidbox FHIR Server.

The testing methodology is described in the following commands:

- [test-cs.md](.claude/commands/test-cs.md) - test CodeSystem resources against FHIR server
- [test-vs.md](.claude/commands/test-vs.md) - test ValueSet resources and expansion
- [test-profile.md](.claude/commands/test-profile.md) - test StructureDefinition profiles with sample data

Ask Claude to test the resources:

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
> /test-profile PacienteCl
```

Take a look at the test cases that were generated in the test directory:

- [test-cs.http](test/CS/test-CSIdentidadGenero.http)
- [test-vs.http](test/VS/test-VSIdentidadGenero.http)
- [test-profile.http](test/Profile/test-PacienteCl.http)

Each test run provides a detailed log of executing the test cases - you should be able to see the log files next to the `.http` file.

The stable `.http` file with all the test cases gives you the ability to rerun all the test cases manually when needed and enables the LLM to iterate on fixing any issues that arise.


### 3. Implementation Guide Publication

Once we are happy with the results, we can generate the Implementation Guide.
The following command will generate all the required HTML files with the IG content and put them to `ig-publisher/output` folder:

- [publish-ig.md](.claude/commands/publish-ig.md) 


Generate and publish the complete IG:
```bash
claude
> /publish-ig
```

### 4. Review Published IG
Once the IG is generated, we can view it in the browser.

- [view-ig.md](.claude/commands/view-ig.md) 

```bash
claude  
> /view-ig
```

### 5. (Optional) Load the IG into Aidbox
Once the IG is generated, you can load it into Aidbox to start using it in your projects.

Navigate to the Aidbox UI -> FAR.
Click "Import package" button and select the `ig-publisher/output/package.tgz` file.


## AI Assistant Configuration

Apart from Claude commands we used above, there's a general configuration file for the Claude in the [CLAUDE.md](CLAUDE.md) file.
