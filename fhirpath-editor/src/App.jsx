import React from "react";
import Editor from "./components/Editor";
import { FhirType } from "./utils/fhir-type";

export function App() {
  const [app, setApp] = React.useState({
    bindings: [
      {
        name: "myString",
        expression: [{ type: "string", value: "Hello, world!" }],
      },
      {
        name: "var1",
        expression: [
          {
            type: "number",
            value: "1",
          },
          {
            type: "operator",
            value: "+",
          },
          {
            type: "number",
            value: "2",
          },
        ],
      },
      {
        name: "var2",
        expression: [
          {
            type: "number",
            value: "1",
          },
          {
            type: "operator",
            value: "+",
          },
          {
            type: "variable",
            value: "var1",
          },
        ],
      },
      {
        name: "var3",
        expression: [
          { type: "variable", value: "questionnaire" },
          { type: "field", value: "item" },
        ],
      },
    ],
    expression: [
      { type: "number", value: "1" },
      { type: "operator", value: "+" },
      { type: "variable", value: "var3" },
    ],
  });

  return (
    <Editor
      value={app}
      setValue={setApp}
      globalBindings={[
        {
          name: "observation",
          type: FhirType(["Observation"]),
        },
        {
          name: "questionnaire",
          type: FhirType(["Questionnaire"]),
        },
        {
          name: "patient",
          type: FhirType(["Patient"]),
        },
      ]}
    />
  );
}
