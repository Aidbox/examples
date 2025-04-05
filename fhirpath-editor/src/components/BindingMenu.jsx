import { DotsSixVertical, Warning, Trash, Copy } from "@phosphor-icons/react";
import React, { useState } from "react";
import {
  FloatingList,
  FloatingPortal,
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  offset,
  shift,
} from "@floating-ui/react";

const BindingMenu = ({
  attributes,
  listeners,
  valid = true,
  active = false,
  onDelete,
  onDuplicate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "right-start",
    middleware: [
      offset({
        mainAxis: 4,
        alignmentAxis: -10,
        crossAxis: 40,
      }),
      // shift({
      //   padding: 10,
      // }),
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
        className="absolute hover:bg-gray-100 active:bg-gray-200 right-full top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer rounded mr-1 py-1 text-gray-400 focus:outline-blue-500 focus:text-gray-500 data-[active]:cursor-grabbing data-[active]:bg-gray-200 data-[invalid]:text-red-500 data-[invalid=true]:scale-125"
        data-active={active || undefined}
        data-invalid={!valid || undefined}
        {...getReferenceProps({
          ...attributes,
          ...listeners,
        })}
      >
        {!valid ? (
          <Warning
            size={16}
            className="animate__animated animate__fadeInLeft animate__faster"
          />
        ) : (
          <DotsSixVertical size={16} weight="bold" />
        )}
      </button>
      {isOpen && (onDelete || onDuplicate) && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white border border-gray-300 rounded-md shadow-lg flex flex-col overflow-hidden min-w-36 animate__animated animate__fadeIn animate__faster"
            {...getFloatingProps()}
          >
            {onDelete && (
              <button
                className="w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_0.75rem] items-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  onDelete?.();
                  setIsOpen(false);
                }}
              >
                <Trash size={16} className="text-gray-500" />
                Delete
              </button>
            )}
            {onDuplicate && (
              <button
                className="w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_0.75rem] items-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  onDuplicate?.();
                  setIsOpen(false);
                }}
              >
                <Copy size={16} className="text-gray-500" />
                Duplicate
              </button>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default BindingMenu;
