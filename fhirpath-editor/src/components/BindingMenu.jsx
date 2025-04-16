import {
  Copy,
  DotsSixVertical,
  DotsThreeVertical,
  PuzzlePiece,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import React, { useState } from "react";
import {
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useProgramContext } from "@utils/store.js";

const BindingMenu = ({
  attributes,
  listeners,
  valid = true,
  dragging = false,
  bindingId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { nameExpression, deleteBinding, duplicateBinding } = useProgramContext(
    (state) => ({
      nameExpression: state.nameExpression,
      deleteBinding: state.deleteBinding,
      duplicateBinding: state.duplicateBinding,
    }),
  );

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    middleware: [
      offset({
        mainAxis: 4,
        alignmentAxis: 0,
        crossAxis: -40,
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
        className="absolute hover:bg-gray-100 active:bg-gray-200 right-full top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer rounded mr-1 py-1 text-gray-400 focus:outline-blue-500 focus:text-gray-500 data-[dragging]:cursor-grabbing data-[dragging]:bg-gray-200"
        data-dragging={dragging || undefined}
        {...getReferenceProps({
          ...attributes,
          ...listeners,
        })}
      >
        {!valid && (
          <Warning
            size={16}
            className="absolute right-full text-red-500 mr-0.5"
          />
        )}
        <DotsThreeVertical size={16} weight="bold" />
      </button>
      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white rounded-md shadow-lg min-w-40 empty:hidden overflow-y-auto relative"
            {...getFloatingProps()}
          >
            {bindingId != null && (
              <button
                className="text-sm w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr] items-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  deleteBinding(bindingId);
                  setIsOpen(false);
                }}
              >
                <Trash size={16} className="text-gray-500" />
                Delete
              </button>
            )}
            {bindingId != null && (
              <button
                className="text-sm w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr] items-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  duplicateBinding(bindingId);
                  setIsOpen(false);
                }}
              >
                <Copy size={16} className="text-gray-500" />
                Duplicate
              </button>
            )}
            {bindingId === null && (
              <button
                className="text-sm w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr] items-center gap-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  nameExpression();
                  setIsOpen(false);
                }}
              >
                <PuzzlePiece size={16} className="text-gray-500" />
                As named expression
              </button>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default BindingMenu;
