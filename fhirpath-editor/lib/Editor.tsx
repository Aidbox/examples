import { useMemo, useState } from "react";
import { parse } from "./utils/fhirpath";
import { Model } from "fhirpath";
import { detectValueType } from "./utils/value";
import {
  Context,
  DeepPartial,
  ExternalBinding,
  FhirRegistry,
  FhirSchema,
  FhirValue,
  IProgram,
} from "./types/internal";
import Program from "./components/Program";
import { ProgramProvider } from "./components/ProgramProvider";
import { generateBindingId } from "./utils/expression";
import { Style, StyleProvider } from "./style";
import { Text, TextProvider } from "./text";

export interface IEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  data: any;
  variables?: Record<string, any>;
  schema: FhirSchema[];
  model: Model;
  debug?: boolean;
  portalRoot?: string;
  style?: DeepPartial<Style>;
  text?: DeepPartial<Text>;
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
  style,
  text,
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
    <StyleProvider style={style}>
      <TextProvider text={text}>
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
      </TextProvider>
    </StyleProvider>
  );
}

export default Editor;
