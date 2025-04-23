import { IProgram, Type, TypeName } from "../types/internal";
import { useProgramContext } from "../utils/store";
import { useCallback, useMemo } from "react";
import { ProgramProvider } from "./ProgramProvider";
import Program from "./Program";

type ArgumentProps = {
  bindingId: string;
  tokenIndex: number;
  argIndex: number;
  suggestedType?: Type;
  contextValue: any;
};

export const Argument = ({
  bindingId,
  tokenIndex,
  argIndex,
  suggestedType,
  contextValue,
}: ArgumentProps) => {
  const {
    arg,
    updateArg,
    context,
    getBindingType,
    getBindingValue,
    getFhirSchema,
    debug,
  } = useProgramContext((state) => ({
    arg: state.getArg(bindingId, tokenIndex, argIndex),
    updateArg: state.updateArg,
    deleteArg: state.deleteArg,
    context: state.getContext(),
    getBindingType: state.getBindingType,
    getBindingValue: state.getBindingValue,
    getFhirSchema: state.getFhirSchema,
    debug: state.getDebug(),
  }));

  const bindableBindings = useProgramContext((state) =>
    state.getBindableBindings(bindingId),
  );

  const externalizedBindings = useMemo(
    () =>
      bindableBindings.map((binding) => ({
        id: binding.id,
        name: binding.name,
        type: getBindingType(binding.id),
        value: getBindingValue(binding.id),
      })),
    [bindableBindings, getBindingType, getBindingValue],
  );

  const onProgramChange = useCallback(
    (program: IProgram) => {
      updateArg(bindingId, tokenIndex, argIndex, program);
    },
    [updateArg, bindingId, tokenIndex, argIndex],
  );

  const argContext = useMemo(
    () => ({
      value: contextValue,
      type:
        suggestedType?.type === TypeName.Lambda
          ? suggestedType.contextType
          : context.type,
    }),
    [contextValue, suggestedType, context],
  );

  return (
    <ProgramProvider
      program={arg}
      onProgramChange={onProgramChange}
      context={argContext}
      externalBindings={externalizedBindings}
      fhirSchema={getFhirSchema()}
      debug={debug}
    >
      <Program className="px-4 pt-3 pb-5" title="Argument expression" />
    </ProgramProvider>
  );
};
