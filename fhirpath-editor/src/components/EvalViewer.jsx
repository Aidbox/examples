import React, { useRef, useState } from "react";
import { JsonView } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { ArrowRight, Empty, Warning } from "@phosphor-icons/react";
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
        <Empty /> empty
      </>
    );
  } else if (value instanceof Error) {
    return (
      <>
        <Warning /> error
      </>
    );
  } else if (Array.isArray(value)) {
    return value.length ? (
      `${value.slice(0, 3).map(format).join(", ")}${value.length > 3 ? ", ..." : ""}`
    ) : (
      <>
        <Empty /> empty
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
  const { getBindingValue } = useProgramContext((state) => ({
    getBindingValue: state.getBindingValue,
  }));

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
        className="cursor-pointer focus:outline-none rounded px-1.5 py-0.5 text-gray-500 data-[error]:text-red-500 data-[error]:font-mono flex items-center gap-1 text-sm truncate"
        // data-error={value instanceof Error || undefined}
      >
        <ArrowRight size={12} />

        {format(value)}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            {...getFloatingProps()}
            className="max-w-96"
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
                stringValue: "text-orange-800 break-all",
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
