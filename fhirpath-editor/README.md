# FHIRPath Editor

A React component library for editing and evaluating FHIRPath expressions with real-time feedback.

## Online Demo

Try the interactive demo at [https://aidbox.github.io/examples/fhirpath-editor/](https://aidbox.github.io/examples/fhirpath-editor/)

## Installation

```bash
npm install fhirpath-editor
# or
yarn add fhirpath-editor
```

## Usage

The library provides an `Editor` component for working with FHIRPath expressions:

```tsx
import { Editor } from "fhirpath-editor";
import r4 from "fhirpath/fhir-context/r4";

function MyFhirPathEditor() {
  // FHIRPath expression to evaluate
  const value = "(1 + 2) * 3";
  const handleChange = (newValue) =>
    console.log("Expression changed:", newValue);

  // Simple FHIR resource to evaluate FHIRPath against
  const data = {
    resourceType: "Patient",
    id: "example",
    name: [
      {
        family: "Smith",
        given: ["John"],
      },
    ],
    birthDate: "1970-01-01",
  };

  // Simple external variables available to FHIRPath expressions
  const variables = {
    questionnaire: {
      resourceType: "Questionnaire",
      id: "simple-example",
      status: "active",
      item: [
        {
          linkId: "1",
          text: "Simple Question",
          type: "string",
        },
      ],
    },
  };

  // FHIR schema can be loaded from https://aidbox.github.io/examples/fhirpath-editor/schema.json
  const fhirSchema = []; // Replace with actual schema data

  return (
    <Editor
      defaultValue={value}
      onChange={handleChange}
      data={data}
      variables={variables}
      schema={fhirSchema}
      model={r4}
    />
  );
}
```

## Props

| Prop           | Type                    | Required | Description                                   |
|----------------|-------------------------|----------|-----------------------------------------------|
| `defaultValue` | string                  | No       | Initial FHIRPath expression                   |
| `onChange`     | (value: string) => void | No       | Callback for expression changes               |
| `data`         | any                     | Yes      | The context data to evaluate FHIRPath against |
| `variables`    | Record<string, any>     | No       | External bindings available to expressions    |
| `schema`       | FhirSchema[]            | Yes      | FHIR schema definitions for validation        |
| `model`        | Model                   | Yes      | FHIR version model data                       |
| `debug`        | boolean                 | No       | Enable debug mode                             |

## Features

- Low-code environment for developing and testing FHIRPath expressions
- Interactive visual editor with instant feedback
- Real-time evaluation against FHIR resources
- Support for external variable bindings
- Schema-based validation with autocomplete suggestions
- Syntax highlighting and error detection
- Reduces development time for complex FHIRPath queries
