import React from "react";
import Editor from "@components/Editor";
import { FhirType } from "@utils/fhir";
import { useJsonFetch } from "@utils/react";
import { generateBindingId } from "@utils/expression.js";
import { SingleType } from "@utils/type.js";

import { stringifyProgram } from "@utils/stringify.js";
import Code from "@components/Code.jsx";
import { ProgramProvider } from "@components/ProgramProvider.jsx";
import ContextEditor from "./ContextEditor.jsx";
import { useLocalStorageState } from "./utils/react.js";

export function App() {
  const { data: fhirSchema, loading, error } = useJsonFetch("schema.json");
  const [program, setProgram] = useLocalStorageState(
    "fhirpath-editor/program",
    {
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
          expression: [
            { type: "quantity", value: { value: "100", unit: "kg" } },
          ],
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
    },
  );

  const patient = {
    resourceType: "Patient",
    id: "example",
    active: true,
    name: [
      {
        use: "official",
        family: "Smith",
        given: ["John"],
      },
    ],
    gender: "male",
    birthDate: "1974-12-25",
    address: [
      {
        use: "home",
        line: ["123 Main St"],
        city: "Anytown",
        state: "CA",
        postalCode: "12345",
        country: "USA",
      },
    ],
  };

  const [context, setContext] = useLocalStorageState(
    "fhirpath-editor/context",
    {
      value: patient,
      type: FhirType(["Patient"]),
    },
  );

  const [externalBindings, setExternalBindings] = useLocalStorageState(
    "fhirpath-editor/externalBindings",
    [
      {
        id: generateBindingId(),
        name: "observation",
        type: SingleType(FhirType(["Observation"])),
        value: {
          resourceType: "Observation",
          id: "blood-pressure",
          status: "final",
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "55284-4",
                display: "Blood pressure",
              },
            ],
          },
          subject: {
            reference: "Patient/example",
          },
          effectiveDateTime: "2023-05-15",
          valueQuantity: {
            value: 120,
            unit: "mmHg",
            system: "http://unitsofmeasure.org",
            code: "mm[Hg]",
          },
        },
      },
      {
        id: generateBindingId(),
        name: "questionnaire",
        type: SingleType(FhirType(["Questionnaire"])),
        value: {
          resourceType: "Questionnaire",
          id: "health-check",
          status: "active",
          title: "Health Check Questionnaire",
          item: [
            {
              linkId: "weight",
              text: "Weight",
              type: "decimal",
            },
            {
              linkId: "height",
              text: "Height",
              type: "decimal",
            },
          ],
        },
      },
      {
        id: generateBindingId(),
        name: "patient",
        type: SingleType(FhirType(["Patient"])),
        value: patient,
      },
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading schema...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">
          Error loading schema: {error}
        </div>
      </div>
    );
  }

  if (!fhirSchema) {
    return null;
  }

  return (
    <div className="gap-2 h-screen grid grid-cols-2">
      <div className="p-8 overflow-auto">
        <ProgramProvider
          program={program}
          onProgramChange={setProgram}
          contextType={context.type}
          contextValue={context.value}
          externalBindings={externalBindings}
          fhirSchema={fhirSchema}
        >
          <Editor />
        </ProgramProvider>
      </div>

      <div className="flex flex-col overflow-auto border-l border-gray-200">
        <h2 className="font-semibold py-2 px-4">Compiled</h2>
        <Code
          className="text-xs p-4 border-t border-gray-200 w-fit"
          value={stringifyProgram(program)}
        />

        <h2 className="font-semibold py-2 px-4">External Bindings</h2>
        <ContextEditor
          context={context}
          setContext={setContext}
          externalBindings={externalBindings}
          setExternalBindings={setExternalBindings}
          fhirSchema={fhirSchema}
        />
      </div>
    </div>
  );
}
