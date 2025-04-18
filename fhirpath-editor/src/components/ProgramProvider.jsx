import { useEffect, useState } from "react";
import { createProgramStore, ProgramContext } from "@utils/store.js";
import { stringifyProgram } from "@utils/stringify.js";

export function ProgramProvider({
  program,
  onProgramChange,
  onFhirPathChange,
  contextType,
  contextValue,
  externalBindings,
  fhirSchema,
  children,
}) {
  const [store, setStore] = useState(null);

  useEffect(() => {
    setStore(
      createProgramStore(
        contextValue,
        contextType,
        externalBindings,
        fhirSchema,
      ),
    );
  }, [contextType, externalBindings, fhirSchema, contextValue]);

  useEffect(() => {
    if (store) {
      return store.subscribe((curState, prevState) => {
        if (curState.program !== prevState.program) {
          const { program, getQuestionnaireItems } = curState;
          onProgramChange(program);
          if (onFhirPathChange) {
            onFhirPathChange(
              stringifyProgram(program, {
                questionnaireItems: getQuestionnaireItems(),
              }),
            );
          }
        }
      });
    }
  }, [store, onProgramChange]);

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
