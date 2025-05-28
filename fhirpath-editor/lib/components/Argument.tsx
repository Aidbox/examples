import { FunctionMetadata, IProgram, TypeName } from "../types/internal";
import { useProgramContext } from "../utils/store";
import { useCallback, useMemo } from "react";
import { ProgramProvider } from "./ProgramProvider";
import { useStyle } from "../style";
import { useText } from "../text";
import Binding from "./Binding.tsx";

type ArgumentProps = {
  bindingId: string;
  tokenIndex: number;
  argIndex: number;
  meta: FunctionMetadata;
};

export const Argument = ({
  bindingId,
  tokenIndex,
  argIndex,
  meta,
}: ArgumentProps) => {
  const style = useStyle();
  const text = useText();
  const {
    arg,
    updateArg,
    getBindingType,
    getBindingValue,
    getFhirSchema,
    getExpressionValue,
    parentContextValue,
    model,
    debug,
    portalRoot,
    getArgContextType,
  } = useProgramContext((state) => ({
    arg: state.getArg(bindingId, tokenIndex, argIndex),
    updateArg: state.updateArg,
    deleteArg: state.deleteArg,
    getBindingType: state.getBindingType,
    getBindingValue: state.getBindingValue,
    getFhirSchema: state.getFhirSchema,
    getExpressionValue: state.getExpressionValue,
    parentContextValue: state.getContext().value,
    model: state.getModel(),
    debug: state.getDebug(),
    portalRoot: state.getPortalRoot(),
    getArgContextType: state.getArgContextType,
  }));

  const bindableBindings = useProgramContext((state) =>
    state.getBindableBindings(bindingId),
  );

  const isLambda = meta.args[argIndex].type.name === TypeName.Lambda;

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

  const contextType = getArgContextType(bindingId, tokenIndex, argIndex);

  const inputValue = isLambda
    ? getExpressionValue(bindingId, tokenIndex - 1)
    : parentContextValue;

  const contextValue = inputValue?.valueAt(0);

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
      isLambda={isLambda}
      externalBindings={externalizedBindings}
      fhirSchema={getFhirSchema()}
      model={model}
      debug={debug}
      portalRoot={portalRoot}
    >
      <div className={style.program.binding}>
        <span></span>
        <Binding
          bindingId={""}
          placeholder={text.function.argument.placeholder.replace(
            "{name}",
            meta.args[argIndex].name,
          )}
          explicitName={
            <span className={style.token.function.argument.name}>
              {meta.args[argIndex].name}{" "}
              {!meta.args[argIndex].optional && (
                <span className={style.token.function.argument.required}></span>
              )}
            </span>
          }
        />
      </div>
    </ProgramProvider>
  );
};
