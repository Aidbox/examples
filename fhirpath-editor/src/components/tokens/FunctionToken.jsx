import React, { useState, useRef, useCallback, Fragment } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingArrow,
  arrow,
  offset,
  flip,
  size,
} from "@floating-ui/react";
import { functionMetadata, category } from "../../utils/function";
import Editor from "../Editor";
import { ArrowSquareUpRight, Trash } from "@phosphor-icons/react";

const Argument = ({ arg, value, onChange, bindings }) => {
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
        [value]
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
        className="leading-nonerelative cursor-pointer px-0.5 py-0.5 rounded hover:bg-gray-100 focus:outline-none field-sizing-content text-sky-800 active:bg-gray-200"
        {...getReferenceProps()}
      >
        <ArrowSquareUpRight size={16} />
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
              title={
                <span>
                  Value for{" "}
                  <span className="font-medium text-sky-800">{arg.name}</span>
                </span>
              }
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const insert = (array, index, value) => {
  if (array.length < index) {
    array = [...array, ...Array(index - array.length).fill(undefined)];
  }
  return [...array.slice(0, index), value, ...array.slice(index)];
};

const FunctionToken = React.forwardRef(
  ({ token, onChange, bindings, expression }, ref) => {
    const fn = token.value
      ? functionMetadata.find((f) => f.name === token.value)
      : null;

    // Check if any required argument is missing
    const empty = !token.value || fn?.args?.some((arg, index) => {
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
          className="focus:bg-gray-100 focus:outline-none px-1 py-0.5 rounded-l last:!rounded-r field-sizing-content text-blue-800 appearance-none"
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
        {fn?.args?.length > 0 ? (
          <>
            <span className="text-gray-500">(</span>
            {fn?.args?.map((arg, index) => (
              <Fragment key={arg.name}>
                <Argument
                  arg={arg}
                  value={
                    token.args?.[index] || { bindings: [], expression: [] }
                  }
                  onChange={(value) => {
                    return onChange({
                      ...token,
                      args: insert(token.args || [], index, value),
                    });
                  }}
                  bindings={bindings}
                />
                {index < fn?.args?.length - 1 && (
                  <span className="pr-0.5 text-gray-500">,</span>
                )}
              </Fragment>
            ))}
            <span className="pr-1 text-gray-500">)</span>
          </>
        ) : (
          <span className="py-0.5 pr-1 text-gray-500">()</span>
        )}
      </div>
    );
  }
);

export default FunctionToken;
