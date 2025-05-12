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

### Uncontrolled Component (with defaultValue)

```tsx
import { Editor } from "fhirpath-editor";
import r4 from "fhirpath/fhir-context/r4";

function MyFhirPathEditor() {
  // FHIRPath expression to evaluate
  const defaultExpr = "(1 + 2) * 3";
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

  const fhirSchema = []; // Replace with actual schema data

  return (
    <Editor
      defaultValue={defaultExpr}
      onChange={handleChange}
      data={data}
      schema={fhirSchema}
      model={r4}
    />
  );
}
```

### Controlled Component (with value)

```tsx
import { Editor } from "fhirpath-editor";
import r4 from "fhirpath/fhir-context/r4";
import { useState } from "react";

function MyFhirPathEditor() {
  // FHIRPath expression state
  const [expression, setExpression] = useState("(1 + 2) * 3");

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

  const fhirSchema = []; // Replace with actual schema data

  return (
    <Editor
      value={expression}
      onChange={setExpression}
      data={data}
      schema={fhirSchema}
      model={r4}
    />
  );
}
```

## Props

| Prop           | Type                    | Required | Description                                     |
| -------------- | ----------------------- | -------- | ----------------------------------------------- |
| `value`        | string                  | No       | Current FHIRPath expression (controlled mode)   |
| `defaultValue` | string                  | No       | Initial FHIRPath expression (uncontrolled mode) |
| `onChange`     | (value: string) => void | No       | Callback for expression changes                 |
| `data`         | any                     | Yes      | The context data to evaluate FHIRPath against   |
| `variables`    | Record<string, any>     | No       | External bindings available to expressions      |
| `schema`       | FhirSchema[]            | Yes      | FHIR schema definitions for validation          |
| `model`        | Model                   | Yes      | FHIR version model data                         |
| `debug`        | boolean                 | No       | Enable debug mode                               |

## Component Modes

The Editor component supports both controlled and uncontrolled modes:

- **Controlled Mode**: Provide the `value` prop and handle changes with `onChange`.
- **Uncontrolled Mode**: Provide only the `defaultValue` prop (initial value) and optionally handle changes with `onChange`.

Note: Do not provide both `value` and `defaultValue` at the same time. If both are provided, `defaultValue` will be ignored and a warning will be logged to the console.

## Features

- Low-code environment for developing and testing FHIRPath expressions
- Interactive visual editor with instant feedback
- Real-time evaluation against FHIR resources
- Support for external variable bindings
- Schema-based validation with autocomplete suggestions
- Syntax highlighting and error detection
- Reduces development time for complex FHIRPath queries

## Todo
- [ ] Support $total special variable
- [ ] Support type evaluation of `aggregate` call
- [ ] Support dynamic index access
