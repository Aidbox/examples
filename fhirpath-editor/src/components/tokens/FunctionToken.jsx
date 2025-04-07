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
} from "../../utils/function";
import Editor from "../Editor";
import { CircleDashed, DotsThreeCircle, Trash } from "@phosphor-icons/react";
import { useContextType } from "../../utils/react.js";
import { getExpressionType } from "../../utils/expression.js";

const Argument = ({ arg, value, onChange, bindings, suggestedType }) => {
  const contextType = useContextType();
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
        [value],
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
        {value && value.expression.length > 0 ? (
          <DotsThreeCircle size={16} />
        ) : (
          <CircleDashed size={16} />
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
                <span className="font-medium text-sky-800">{arg.name}</span>
              </span>
              {arg.optional && (
                <button
                  className="ml-auto p-1 rounded hover:bg-gray-100 cursor-pointer active:bg-gray-200"
                  onClick={() => onChange(null)}
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
            <Editor
              className="px-4 pt-3 pb-5"
              value={value}
              setValue={onChange}
              externalBindings={bindings}
              contextType={
                suggestedType?.type === "Lambda"
                  ? suggestedType.contextType
                  : contextType
              }
              title="Argument expression"
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const FunctionToken = React.forwardRef(
  ({ token, onChange, bindings, expression }, ref) => {
    const contextType = useContextType();

    const inputType =
      expression.length > 1
        ? getExpressionType(expression.slice(0, -1), bindings, contextType)
        : contextType;

    const meta = token.value
      ? functionMetadata.find((f) => f.name === token.value)
      : null;

    const suggestArgumentTypes = suggestArgumentTypesForFunction(
      meta.name,
      inputType,
      [],
    );

    const empty =
      !token.value ||
      meta?.args?.some((arg, index) => {
        const argValue = token.args?.[index];
        return (
          !arg.optional &&
          (!argValue ||
            !argValue.expression ||
            argValue.expression.length === 0)
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
          onChange={(e) => onChange({ ...token, value: e.target.value })}
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
        {meta?.args?.map((arg, index) => (
          <Argument
            key={arg.name}
            arg={arg}
            value={token.args?.[index] || { bindings: [], expression: [] }}
            onChange={(value) => {
              const args = token.args?.slice() || [];
              args[index] = value;
              return onChange({ ...token, args });
            }}
            bindings={bindings}
            suggestedType={suggestArgumentTypes[index]}
          />
        ))}
      </div>
    );
  },
);

export default FunctionToken;
