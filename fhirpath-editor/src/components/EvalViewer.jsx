import React, { useRef, useState } from "react";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { Empty, Warning } from "@phosphor-icons/react";
import { useProgramContext } from "@utils/store.js";
import {
  arrow,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useRole,
} from "@floating-ui/react";

function format(value) {
  if (value === null || value === undefined) {
    return (
      <>
        <Empty size={14} weight="regular" className="mr-1" /> empty result
      </>
    );
  } else if (value instanceof Error) {
    return (
      <>
        <Warning size={14} weight="regular" className="mr-1" /> Evaluation
        failed
      </>
    );
  } else if (Array.isArray(value)) {
    return value.length ? (
      `${value.slice(0, 3).map(format).join(", ")}${value.length > 3 ? ", ..." : ""}`
    ) : (
      <>
        <Empty size={14} weight="regular" className="mr-1" /> empty result
      </>
    );
  }
  if (typeof value === "object") {
    if (Object.keys(value).length === 0) return "{}";
    if (value.resourceType) return `${value.resourceType}`;
    return "{...}";
  }
  return String(value);
}

const EvalViewer = ({ bindingId }) => {
  const getBindingValue = useProgramContext((state) => state.getBindingValue);
  const value = getBindingValue(bindingId);
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: "right",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset({
        mainAxis: 6,
      }),
      shift(),
      flip(),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.querySelector("[role=tree]").style, {
            maxHeight: `${Math.max(0, availableHeight)}px`,
          });
        },
      }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const headingId = useId();

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="flex items-center cursor-pointer rounded px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 data-[error]:text-red-500 data-[error]:hover:text-red-700 text-xs font-mono whitespace-nowrap group"
        data-error={value instanceof Error || undefined}
      >
        {format(value)}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            {...getFloatingProps()}
            className=""
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-white [&>path:first-of-type]:stroke-gray-300 [&>path:last-of-type]:stroke-white"
              strokeWidth={1}
              height={6}
              width={10}
              style={{
                right: "calc(100% - 2px)",
              }}
            />
            <JsonView
              data={value instanceof Error ? value.message : value}
              style={{
                container:
                  "bg-white rounded-md border border-gray-300 shadow-lg overflow-auto text-xs p-2 bg-gray-50 font-mono",
                punctuation: "text-gray-400",
                // noQuotesForStringValues: true,
                label: "font-normal mr-2 text-gray-600",
                stringValue: "text-orange-800",
                collapsedContent:
                  "px-1 after:content-['...'] font-normal text-gray-600 font-sans",
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default EvalViewer;
