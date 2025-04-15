import { useEffect, useRef } from "react";
import { createProgramStore, ProgramContext } from "@utils/store.js";

export function ProgramProvider({
  program,
  onProgramChange,
  contextType,
  externalBindings,
  fhirSchema,
  children,
}) {
  const store = useRef(null);

  if (!store.current) {
    store.current = createProgramStore(
      contextType,
      externalBindings,
      fhirSchema,
    );
  }

  useEffect(() => {
    if (store.current) {
      return store.current.subscribe((curState, prevState) => {
        if (curState.program !== prevState.program) {
          onProgramChange(curState.program);
        }
      });
    }
  }, [onProgramChange]);

  useEffect(() => {
    if (store.current) {
      store.current.getState().setProgram(program);
    }
  }, [program]);

  return (
    <ProgramContext.Provider value={store.current}>
      {children}
    </ProgramContext.Provider>
  );
}
