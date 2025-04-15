import { useEffect, useState } from "react";
import { createProgramStore, ProgramContext } from "@utils/store.js";

export function ProgramProvider({
  program,
  onProgramChange,
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
          onProgramChange(curState.program);
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
