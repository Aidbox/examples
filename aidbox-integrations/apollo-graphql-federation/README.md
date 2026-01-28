---
features: [Graphql, Federation, Apollo]
languages: [YAML, JavaScript]
---
# Apollo Federation with Aidbox

Access Aidbox's FHIR GraphQL API through an Apollo Gateway via [Apollo Federation v2](https://www.apollographql.com/docs/federation/).

## Overview

Apollo Federation allows you to compose multiple GraphQL services (subgraphs) into a single unified API (supergraph).
With Aidbox's federation support enabled, Aidbox exposes its FHIR GraphQL schema as a federation-compatible subgraph, which can be consumed by Apollo Gateway.

## Prerequisites

1. Docker
2. Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
3. Working directory: `apollo-graphql-federation`
4. Aidbox license key

```
git clone https://github.com/Aidbox/examples.git
cd examples/aidbox-integrations/apollo-graphql-federation
```

## Run Aidbox and Apollo gateway

```bash
docker compose up
```

## Activate your Aidbox

Visit to http://localhost:8080 and activate your Aidbox instance

Now you can access to apollo router http://localhost:4000/

## How Federation Works

When federation is enabled (`BOX_MODULE_GRAPHQL_FEDERATION_SUPPORT=true`), Aidbox:

1. **Adds Federation 2 directives** to the GraphQL schema:
   - `@link` - Declares this as a Federation 2 schema
   - `@key(fields: "id")` - Marks FHIR resource types as entities
   - `@shareable` - Allows types to be resolved by multiple subgraphs

2. **Exposes `_service` query** that returns the GraphQL SDL with federation directives

3. **Implements `_entities` resolver** for resolving entity references

## Usage

### Creating Test Data

Create a few patients in Aidbox using the REST Console:

{% code title="Request" %}
```http
PUT /fhir/Patient/pt-1
content-type: text/yaml
accept: text/yaml

id: pt-1
name:
  - family: Smith
    given: [John]
birthDate: '1990-01-15'
```
{% endcode %}

{% code title="Request" %}
```http
PUT /fhir/Patient/pt-2
content-type: text/yaml
accept: text/yaml

id: pt-2
name:
  - family: Johnson
    given: [Jane]
birthDate: '1985-06-20'
```
{% endcode %}

### Querying via Apollo Gateway

You can query Aidbox through the Apollo Gateway at `http://localhost:4000`.
You can also open this URL in a browser to access Apollo Sandbox - an interactive GraphQL IDE for exploring the schema and running queries.

#### Query a Single Patient

{% code title="Request" %}
```bash
curl -s -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -u "root:secret" \
  -d '{"query": "{ Patient(id: \"pt-1\") { id name { family given } birthDate } }"}'
```
{% edncode %}

{% code title="Response" %}
``` json
{
  "data": {
    "Patient": {
      "id": "pt-1",
      "name": [{
        "family": "Smith",
        "given": ["John"]
      }],
      "birthDate": "1990-01-15"
    }
  }
}
```
{% endcode %}

#### Query All Patients

{% code title="Request" %}
```bash
curl -s -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -u "root:secret" \
  -d '{"query": "{ PatientList { id name { family given } birthDate } }"}'
```
{% endcode %}

{% code title="Response" %}
```json
{
  "data": {
    "PatientList": [{
      "id": "pt-1",
      "name": [{
        "family": "Smith",
        "given": ["John"]
      }],
      "birthDate": "1990-01-15"
    }, {
      "id": "pt-2",
      "name": [{
        "family": "Johnson",
        "given": ["Jane"]
      }],
      "birthDate": "1985-06-20"
    }]
  }
}
```
{% endcode %}
