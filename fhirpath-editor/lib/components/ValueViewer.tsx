import { ReactNode, useRef, useState } from "react";
import { JsonView } from "react-json-view-lite";
import { ArrowRight, Empty, Warning } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
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
import { FhirValue } from "../types/internal";
import css from "./ValueViewer.module.css";
import jsonViewCss from "./JsonView.module.css";

function format(value: FhirValue): ReactNode {
  if (value.error) {
    return (
      <>
        <Warning /> error
      </>
    );
  } else if (value.value == null) {
    return (
      <>
        <Empty /> empty
      </>
    );
  } else if (Array.isArray(value.value)) {
    return value.value.length ? (
      `${value.value
        .slice(0, 3)
        .map((x) => (typeof x !== "object" ? x : "{...}"))
        .join(", ")}${value.value.length > 3 ? ", ..." : ""}`
    ) : (
      <>
        <Empty /> empty
      </>
    );
  }
  if (typeof value.value === "object") {
    if (Object.keys(value.value).length === 0) return "{}";
    if (value.value.resourceType) return `${value.value.resourceType}`;
    return "{...}";
  }
  return String(value.value);
}

type EvalViewerProps = {
  bindingId: string;
};

const ValueViewer = ({ bindingId }: EvalViewerProps) => {
  const { name, getBindingValue } = useProgramContext((state) => ({
    name: bindingId && state.getBindingName(bindingId),
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
          const target = elements.floating.querySelector("[role=tree]") as
            | HTMLDivElement
            | undefined;
          if (target) {
            Object.assign(target.style, {
              maxHeight: `${Math.max(0, availableHeight)}px`,
            });
          }
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
        className={css.button}
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
            className={css.popover}
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className={css.arrow}
              strokeWidth={1}
              height={6}
              width={10}
            />
            {value.error ? (
              <div className={css.error}>
                <Warning />
                <div>
                  {!value.origin || value.origin === name
                    ? value.error.message
                    : `One of the bindings (${value.origin}) has an error`}
                </div>
              </div>
            ) : (
              <JsonView
                data={value.value}
                style={{
                  container: jsonViewCss.container,
                  punctuation: jsonViewCss.punctuation,
                  label: jsonViewCss.label,
                  stringValue: jsonViewCss.stringValue,
                  collapsedContent: jsonViewCss.collapsedContent,
                }}
              />
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default ValueViewer;
