import { ReactNode, useEffect, useState } from "react";
import {
  createProgramStore,
  IProgramStore,
  ProgramContext,
} from "../utils/store";
import {
  Context,
  ExternalBinding,
  FhirRegistry,
  IProgram,
} from "../types/internal";
import { StoreApi } from "zustand/index";
import { unparse } from "../utils/fhirpath";

type ProgramProviderProps = {
  program: IProgram;
  onProgramChange?: (program: IProgram) => void;
  onFhirPathChange?: (fhirPath: string) => void;
  context: Context;
  externalBindings: ExternalBinding[];
  fhirSchema: FhirRegistry;
  debug: boolean;
  children: ReactNode;
};

export function ProgramProvider({
  program,
  onProgramChange,
  onFhirPathChange,
  context,
  externalBindings,
  fhirSchema,
  debug,
  children,
}: ProgramProviderProps) {
  const [store, setStore] = useState<StoreApi<IProgramStore> | null>(null);

  useEffect(() => {
    setStore(createProgramStore(context, externalBindings, fhirSchema, debug));
  }, [context, externalBindings, fhirSchema, debug]);

  useEffect(() => {
    if (store) {
      return store.subscribe((curState, prevState) => {
        if (curState.program !== prevState.program) {
          const { program, getQuestionnaireItems } = curState;
          onProgramChange?.(program);
          if (onFhirPathChange) {
            onFhirPathChange(
              unparse(program.expression, {
                questionnaireItems: getQuestionnaireItems(),
                bindings: program.bindings,
              }),
            );
          }
        }
      });
    }
  }, [store, onProgramChange, onFhirPathChange]);

  useEffect(() => {
    if (store) {
      store.getState().setProgram(program);
    }
  }, [store, program]);

  return (
    store && (
      <ProgramContext.Provider value={store}>
        {children}
      </ProgramContext.Provider>
    )
  );
}
