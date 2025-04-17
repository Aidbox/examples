import React from "react";
import Editor from "@components/Editor";
import { FhirType } from "@utils/fhir";
import { useJsonFetch } from "@utils/react";

import { stringifyProgram } from "@utils/stringify.js";
import Code from "@components/Code.jsx";
import { ProgramProvider } from "@components/ProgramProvider.jsx";
import ContextEditor from "./ContextEditor.jsx";
import { useLocalStorageState } from "./utils/react.js";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export function App() {
  const { data: fhirSchema, loading, error } = useJsonFetch("schema.json");
  const [program, setProgram] = useLocalStorageState(
    "fhirpath-editor/program",
    {
      bindings: [],
      expression: [],
    },
  );

  const [context, setContext] = useLocalStorageState(
    "fhirpath-editor/context",
    {
      value: {
        resourceType: "QuestionnaireResponse",
        id: "health-check",
        status: "active",
        title: "Health Check Questionnaire",
        item: [
          {
            linkId: "weight",
            text: "Weight",
            type: "decimal",
            answer: {
              valueDecimal: 100,
            },
          },
          {
            linkId: "height",
            text: "Height",
            type: "decimal",
            answer: {
              valueDecimal: 180,
            },
          },
        ],
      },
      type: FhirType(["QuestionnaireResponse"]),
    },
  );

  const [externalBindings, setExternalBindings] = useLocalStorageState(
    "fhirpath-editor/externalBindings",
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm">Loading schema...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-red-500">
          Error loading schema: {error}
        </div>
      </div>
    );
  }

  if (!fhirSchema) {
    return null;
  }

  return (
    <div className="h-screen">
      <PanelGroup direction="horizontal" autoSaveId="fhirpath-editor/1">
        <Panel className="flex flex-col">
          <div className="p-8 flex-1 overflow-auto">
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
        </Panel>
        <PanelResizeHandle>
          <div className="bg-gray-200 w-[1px] h-full" />
        </PanelResizeHandle>
        <Panel>
          <PanelGroup direction="vertical" autoSaveId="fhirpath-editor/2">
            <Panel className="flex flex-col">
              <h2 className="font-medium py-2 px-2 text-sm text-gray-500">
                Compiled FHIRPath
              </h2>
              <Code
                className="text-sm p-4 border-t border-gray-200 w-full flex-1 overflow-auto"
                value={stringifyProgram(program)}
              />
            </Panel>
            <PanelResizeHandle>
              <div className="bg-gray-200 h-[1px] w-full" />
            </PanelResizeHandle>
            <Panel className="flex flex-col">
              <h2 className="font-medium py-2 px-2 text-sm text-gray-500">
                External Bindings
              </h2>
              <ContextEditor
                context={context}
                setContext={setContext}
                externalBindings={externalBindings}
                setExternalBindings={setExternalBindings}
                fhirSchema={fhirSchema}
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
