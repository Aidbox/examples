import React, { Fragment, useRef, useState } from "react";
import {
  arrow,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import {
  category,
  functionMetadata,
  suggestArgumentTypesForFunction,
} from "@utils/function";
import Editor from "@components/Editor";
import { Gear, Trash } from "@phosphor-icons/react";
import { ProgramProvider, useProgramContext } from "@utils/store.jsx";

const Argument = ({ bindingId, tokenIndex, argIndex, meta, suggestedType }) => {
  const { arg, updateArg, deleteArg, contextType } = useProgramContext(
    (state) => ({
      arg: state.getArg(bindingId, tokenIndex, argIndex),
      updateArg: state.updateArg,
      deleteArg: state.deleteArg,
      contextType: state.getContextType(),
    }),
  );

  const precedingBindings = useProgramContext((state) =>
    state.getPrecedingBindings(bindingId),
  );

  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "right",
    middleware: [
      arrow({ element: arrowRef }),
      offset(12),
      flip({ padding: 6 }),
      size(
        {
          padding: 6,
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.max(0, availableHeight)}px`,
            });
          },
        },
        [arg],
      ),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        className="self-stretch cursor-pointer px-0.5 py-0.5 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 field-sizing-content text-sky-800 active:bg-gray-200"
        {...getReferenceProps()}
      >
        {arg && arg.expression.length > 0 ? (
          <Gear size={16} weight="duotone" />
        ) : (
          <Gear size={16} />
        )}
      </button>
      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white rounded-lg shadow-xl min-w-72 overflow-y-auto"
            {...getFloatingProps()}
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              fill="red"
              stroke="blue"
            />
            <div className="flex items-center py-3 px-4 border-b border-gray-200">
              <span>
                Argument{" "}
                <span className="font-medium text-sky-800">{meta.name}</span>
              </span>
              {meta.optional && (
                <button
                  className="ml-auto p-1 rounded hover:bg-gray-100 cursor-pointer active:bg-gray-200"
                  onClick={() => deleteArg(bindingId, tokenIndex, argIndex)}
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
            <ProgramProvider
              program={arg}
              onProgramChange={(arg) =>
                updateArg(bindingId, tokenIndex, argIndex, arg)
              }
              contextType={
                suggestedType?.type === "Lambda"
                  ? suggestedType.contextType
                  : contextType
              }
              externalBindings={precedingBindings}
            >
              <Editor className="px-4 pt-3 pb-5" title="Argument expression" />
            </ProgramProvider>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const FunctionToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const meta = token.value
    ? functionMetadata.find((f) => f.name === token.value)
    : null;

  const suggestArgumentTypes = suggestArgumentTypesForFunction(
    meta.name,
    precedingExpressionType,
    [],
  );

  console.log(meta, meta?.args);

  const empty =
    !token.value ||
    meta?.args?.some((arg, index) => {
      const argValue = token.args?.[index];
      return (
        !arg.optional &&
        (!argValue || !argValue.expression || argValue.expression.length === 0)
      );
    });

  return (
    <div
      className="inline-flex items-center hover:outline hover:outline-gray-300 rounded data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300"
      data-empty={empty || undefined}
    >
      <select
        ref={ref}
        className="hover:bg-gray-100 focus:bg-gray-100 focus:outline-none px-1 py-0.5 rounded-l last:!rounded-r field-sizing-content text-blue-800 appearance-none"
        value={token.value}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, {
            value: e.target.value,
            args: [],
          })
        }
      >
        {!token.value && (
          <option value="" disabled>
            Select function
          </option>
        )}

        {Object.entries(category).map(([categoryName, functionNames]) => (
          <optgroup key={categoryName} label={categoryName}>
            {functionNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {meta?.args.map((arg, argIndex) => (
        <Argument
          key={argIndex}
          meta={arg}
          bindingId={bindingId}
          tokenIndex={tokenIndex}
          argIndex={argIndex}
          suggestedType={suggestArgumentTypes[argIndex]}
        />
      ))}
    </div>
  );
});

export default FunctionToken;
