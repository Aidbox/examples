import { useState } from "react";
import Editor from "@/components/Editor.tsx";
import { useJsonFetch } from "@/utils/react";

import Code from "@/components/Code";
import { ProgramProvider } from "@/components/ProgramProvider";
import ContextEditor from "./ContextEditor";
import { useLocalStorageState } from "@/utils/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { generateBindingId } from "@/utils/expression";
import q from "./vital-signs.json";
import qr from "./vital-signs-response.json";
import { FhirType, IFhirSchema } from "@/utils/fhir.ts";
import {
  IContext,
  IExternalBinding,
  IProgram,
  TokenType,
} from "@/types/internal.ts";

export function App() {
  const {
    data: fhirSchema,
    loading,
    error,
  } = useJsonFetch<IFhirSchema[]>("schema.json");
  const [fhirPath, setFhirPath] = useState("");
  const [program, setProgram] = useLocalStorageState<IProgram>(
    "fhirpath-editor/program",
    {
      bindings: [
        {
          name: "var1",
          expression: [
            { type: TokenType.answer, value: "iGM-r-zT" },
            { type: TokenType.field, value: "value" },
          ],
          id: generateBindingId(),
        },
        {
          name: "var2",
          expression: [
            { type: TokenType.answer, value: "e_NKgvHO" },
            { type: TokenType.field, value: "value" },
            {
              type: TokenType.function,
              value: "power",
              args: [
                {
                  bindings: [],
                  expression: [{ type: TokenType.number, value: "2" }],
                },
              ],
            },
          ],
          id: generateBindingId(),
        },
      ],
      expression: [
        { type: TokenType.variable, value: "var1" },
        { type: TokenType.operator, value: "/" },
        { type: TokenType.variable, value: "var2" },
      ],
    },
  );

  const [context, setContext] = useLocalStorageState<IContext>(
    "fhirpath-editor/context",
    {
      type: FhirType(["QuestionnaireResponse"]),
      value: qr,
    },
  );

  const [externalBindings, setExternalBindings] = useLocalStorageState<
    IExternalBinding[]
  >("fhirpath-editor/externalBindings", [
    {
      name: "questionnaire",
      id: generateBindingId(),
      type: FhirType(["Questionnaire"]),
      value: q,
    },
  ]);

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
              onFhirPathChange={setFhirPath}
              context={context}
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
                value={fhirPath}
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
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
