import { FhirValue, IProgram, Type } from "../types/internal";
import { useProgramContext } from "../utils/store";
import { useCallback, useMemo } from "react";
import { ProgramProvider } from "./ProgramProvider";
import Program from "./Program";
import { useStyle } from "../style";
import { useText } from "../text";

type ArgumentProps = {
  bindingId: string;
  tokenIndex: number;
  argIndex: number;
  contextValue: FhirValue;
  contextType: Type;
  isLambda: boolean;
};

export const Argument = ({
  bindingId,
  tokenIndex,
  argIndex,
  contextValue,
  contextType,
  isLambda,
}: ArgumentProps) => {
  const style = useStyle();
  const text = useText();
  const {
    arg,
    updateArg,
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

  const context = useMemo(
    () => ({
      value: contextValue,
      type: contextType,
    }),
    [contextValue, contextType],
  );

  return (
    <ProgramProvider
      program={arg}
      onProgramChange={onProgramChange}
      context={context}
      allowBindings={false}
      isLambda={isLambda}
      externalBindings={externalizedBindings}
      fhirSchema={getFhirSchema()}
      model={model}
      debug={debug}
      portalRoot={portalRoot}
    >
      <Program
        className={style.token.function.argument.program}
        title={null}
        placeholder={text.program.placeholder.argumentExpression}
      />
    </ProgramProvider>
  );
};
