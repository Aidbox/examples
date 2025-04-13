import React from "react";
import Editor from "@components/Editor";
import { FhirType } from "@utils/fhir-type";
import { stringifyProgram, highlightFhirPath } from "@utils/fhir";
import { useDebug } from "@utils/react";
import { ProgramProvider } from "@utils/store.jsx";

export function App() {
  const debug = useDebug();
  const [program, setProgram] = React.useState({
    bindings: [
      {
        name: "valid",
        expression: [{ type: "boolean", value: "false" }],
      },
      {
        name: "greet",
        expression: [{ type: "string", value: "Hello, world!" }],
      },
      {
        name: "weight",
        expression: [{ type: "quantity", value: { value: "100", unit: "kg" } }],
      },
      {
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
          <Editor
            value={program}
            setValue={setProgram}
            contextType={FhirType(["Patient"])}
            externalBindings={externalBindings}
          />
        </ProgramProvider>
      </div>

      <div className="p-8 flex flex-col gap-2 overflow-auto">
        <h2 className="font-semibold">Compiled</h2>
        <div
          className="text-xs p-4 rounded-md border border-gray-200 w-fit"
          dangerouslySetInnerHTML={{
            __html: highlightFhirPath(stringifyProgram(program)),
          }}
        />
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
