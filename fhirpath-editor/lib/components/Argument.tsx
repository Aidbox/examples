import { IProgram, Type, TypeName } from "../types/internal";
import { useProgramContext } from "../utils/store";
import { useCallback, useMemo } from "react";
import { ProgramProvider } from "./ProgramProvider";
import Program from "./Program";
import { useStyle } from "../style";

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
  const style = useStyle();
  const {
    arg,
    updateArg,
    context,
    getBindingType,
    getBindingValue,
    getFhirSchema,
    model,
    debug,
    portalRoot,
  } = useProgramContext((state) => ({
    arg: state.getArg(bindingId, tokenIndex, argIndex),
    updateArg: state.updateArg,
    deleteArg: state.deleteArg,
    context: state.getContext(),
    getBindingType: state.getBindingType,
    getBindingValue: state.getBindingValue,
    getFhirSchema: state.getFhirSchema,
    model: state.getModel(),
    debug: state.getDebug(),
    portalRoot: state.getPortalRoot(),
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
      model={model}
      debug={debug}
      portalRoot={portalRoot}
    >
      <Program
        className={style.token.function.argument.program}
        title="Argument expression"
      />
    </ProgramProvider>
  );
};
