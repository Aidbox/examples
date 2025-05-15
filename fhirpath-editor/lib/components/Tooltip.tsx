import { HTMLProps, ReactNode, Ref, useRef, useState } from "react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { useStyle } from "../style";
import { useProgramContext } from "../utils/store";

interface TooltipProps {
  content: ReactNode;
  children: (
    props: (userProps?: Record<string, unknown>) => Record<string, unknown>,
    ref: Ref<HTMLElement>,
  ) => ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  delay?: number;
}

function Tooltip({
  content,
  children,
  placement = "top",
  delay = 0,
}: TooltipProps) {
  const style = useStyle();
  const portalRoot = useProgramContext((state) => state.getPortalRoot());
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, {
    delay: {
      open: delay,
      close: 0,
    },
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return content ? (
    <>
      {children(
        (props) =>
          getReferenceProps({
            ...props,
            "data-tooltip-open": isOpen || undefined,
          } as HTMLProps<Element>),
        refs.setReference,
      )}
      {isOpen && (
        <FloatingPortal id={portalRoot}>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={style.tooltip.container}
            {...getFloatingProps()}
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className={style.dropdown.arrow}
              strokeWidth={1}
              height={6}
              width={10}
            />
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  ) : (
    children((props) => props || {}, refs.setReference)
  );
}

export default Tooltip;
