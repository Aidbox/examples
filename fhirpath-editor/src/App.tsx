import { Editor, FhirSchema } from "../lib/index";

import Code from "./components/Code";
import ContextEditor from "./components/ContextEditor";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import q from "./vital-signs.json";
import qr from "./vital-signs-response.json";
import { useDebug, useJsonFetch, useLocalStorageState } from "./utils/react";

export function App() {
  const debug = useDebug();

  const {
    data: fhirSchema,
    loading,
    error,
  } = useJsonFetch<FhirSchema[]>("schema.json");

  const [value, setValue] = useLocalStorageState(
    "fhirpath-editor/value",
    "/* #b */ (1 + 2) * /* #a */ 3",
  );

  const [data, setData] = useLocalStorageState("fhirpath-editor/data", qr);

  const [variable, setVariables] = useLocalStorageState<Record<string, any>>(
    "fhirpath-editor/variables",
    {
      questionnaire: q,
    },
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
            <Editor
              defaultValue={value}
              onChange={setValue}
              data={data}
              variables={variable}
              schema={fhirSchema}
              debug={debug}
            />
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
                value={value}
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
                context={data}
                setContext={setData}
                externalBindings={variable}
                setExternalBindings={setVariables}
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
