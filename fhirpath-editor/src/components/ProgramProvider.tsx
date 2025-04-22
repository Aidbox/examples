import { ReactNode, useEffect, useState } from "react";
import {
  createProgramStore,
  IProgramStore,
  ProgramContext,
} from "@/utils/store";
import { stringifyProgram } from "@/utils/stringify";
import { IContext, IExternalBinding, IProgram } from "@/types/internal";
import { IFhirRegistry, IFhirSchema } from "@/utils/fhir.ts";
import { StoreApi } from "zustand/index";

interface IProgramProviderProps {
  program: IProgram;
  onProgramChange: (program: IProgram) => void;
  onFhirPathChange?: (fhirPath: string) => void;
  context: IContext;
  externalBindings: IExternalBinding[];
  fhirSchema: IFhirSchema[] | IFhirRegistry;
  children: ReactNode;
}

export function ProgramProvider({
  program,
  onProgramChange,
  onFhirPathChange,
  context,
  externalBindings,
  fhirSchema,
  children,
}: IProgramProviderProps) {
  const [store, setStore] = useState<StoreApi<IProgramStore> | null>(null);

  useEffect(() => {
    setStore(createProgramStore(context, externalBindings, fhirSchema));
  }, [context, externalBindings, fhirSchema]);

  useEffect(() => {
    if (store) {
      return store.subscribe((curState, prevState) => {
        if (curState.program !== prevState.program) {
          const { program, getQuestionnaireItems, getBindingsOrder } = curState;
          onProgramChange(program);
          if (onFhirPathChange) {
            onFhirPathChange(
              stringifyProgram(program, {
                questionnaireItems: getQuestionnaireItems(),
                bindingsOrder: getBindingsOrder(),
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
