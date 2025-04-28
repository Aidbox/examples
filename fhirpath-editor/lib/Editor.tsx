import { useMemo, useState } from "react";
import { parse } from "./utils/fhirpath";
import { Model } from "fhirpath";
import { detectValueType } from "./utils/value";
import {
  Context,
  ExternalBinding,
  FhirRegistry,
  FhirSchema,
  FhirValue,
  IProgram,
} from "./types/internal";
import Program from "./components/Program";
import { ProgramProvider } from "./components/ProgramProvider";
import { generateBindingId } from "./utils/expression";

export interface IEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  data: any;
  variables?: Record<string, any>;
  schema: FhirSchema[];
  model: Model;
  debug?: boolean;
  portalRoot?: string;
}

function Editor({
  defaultValue,
  onChange,
  data,
  variables,
  schema,
  model,
  debug,
  portalRoot,
}: IEditorProps) {
  const [program, setProgram] = useState<IProgram>(() =>
    parse(defaultValue || ""),
  );

  const externalBindings = useMemo((): ExternalBinding[] => {
    return Object.entries(variables || {}).map(([name, value]) => ({
      id: generateBindingId(),
      name,
      type: detectValueType(value),
      value: new FhirValue(value),
    }));
  }, [variables]);

  const fhirSchema = useMemo(() => {
    const result: FhirRegistry = {};
    schema.forEach((entry) => {
      if (entry.id) result[entry.id] = entry;
      if (entry.url) result[entry.url] = entry;
    });
    return result;
  }, [schema]);

  const context = useMemo((): Context => {
    return {
      type: detectValueType(data),
      value: new FhirValue(data),
    };
  }, [data]);

  return (
    <ProgramProvider
      program={program}
      onProgramChange={setProgram}
      onFhirPathChange={onChange}
      context={context}
      externalBindings={externalBindings}
      fhirSchema={fhirSchema}
      model={model}
      debug={!!debug}
      portalRoot={portalRoot}
    >
      <Program />
    </ProgramProvider>
  );
}

export default Editor;
