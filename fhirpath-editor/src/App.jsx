import React from "react";
import Editor from "@components/Editor";
import { FhirType } from "@utils/fhir-type";
import { useDebug } from "@utils/react";
import { ProgramProvider } from "@utils/store.jsx";
import { generateBindingId } from "@utils/expression.js";
import { SingleType } from "@utils/type.js";

import { stringifyProgram } from "@utils/stringify.js";
import Code from "@components/Code.jsx";

export function App() {
  const debug = useDebug();
  const [program, setProgram] = React.useState({
    bindings: [
      {
        id: generateBindingId(),
        name: "casted",
        expression: [
          { type: "number", value: "42" },
          { type: "operator", value: "as" },
          { type: "type", value: { type: "Decimal" } },
        ],
      },
      {
        id: generateBindingId(),
        name: "valid",
        expression: [{ type: "boolean", value: "false" }],
      },
      {
        id: generateBindingId(),
        name: "greet",
        expression: [{ type: "string", value: "Hello, world!" }],
      },
      {
        id: generateBindingId(),
        name: "weight",
        expression: [{ type: "quantity", value: { value: "100", unit: "kg" } }],
      },
      {
        id: generateBindingId(),
        name: "addition",
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
        id: generateBindingId(),
        name: "subtraction",
        expression: [
          {
            type: "variable",
            value: "weight",
          },
          {
            type: "operator",
            value: "-",
          },
          {
            type: "number",
            value: "1",
          },
        ],
      },
      {
        id: generateBindingId(),
        name: "item",
        expression: [
          { type: "variable", value: "questionnaire" },
          {
            type: "function",
            value: "repeat",
            args: [
              {
                bindings: [],
                expression: [
                  {
                    type: "field",
                    value: "item",
                  },
                ],
              },
            ],
          },
          {
            type: "function",
            value: "where",
            args: [
              {
                bindings: [],
                expression: [
                  {
                    type: "field",
                    value: "linkId",
                  },
                  { type: "operator", value: "=" },
                  { type: "string", value: "weight" },
                ],
              },
            ],
          },
          {
            type: "field",
            value: "text",
          },
        ],
      },
    ],
    expression: [
      { type: "number", value: "1" },
      { type: "operator", value: "+" },
      { type: "variable", value: "subtraction" },
    ],
  });

  const externalBindings = [
    {
      id: generateBindingId(),
      name: "observation",
      type: SingleType(FhirType(["Observation"])),
    },
    {
      id: generateBindingId(),
      name: "questionnaire",
      type: SingleType(FhirType(["Questionnaire"])),
    },
    {
      id: generateBindingId(),
      name: "patient",
      type: SingleType(FhirType(["Patient"])),
    },
  ];

  return (
    <div className="gap-2 h-screen grid grid-cols-2">
      <div className="p-8 border-r border-gray-200 overflow-auto">
        <ProgramProvider
          program={program}
          onProgramChange={setProgram}
          contextType={FhirType(["Patient"])}
          externalBindings={externalBindings}
        >
          <Editor />
        </ProgramProvider>
      </div>

      <div className="p-8 flex flex-col gap-2 overflow-auto">
        <h2 className="font-semibold">Compiled</h2>
        <Code value={stringifyProgram(program)} />
        {debug && (
          <>
            <h2 className="font-semibold">State</h2>
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-md border border-gray-200">
              {JSON.stringify(program, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
