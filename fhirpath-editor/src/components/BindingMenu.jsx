import {
  Copy,
  DotsThreeVertical,
  PuzzlePiece,
  Trash,
} from "@phosphor-icons/react";
import React from "react";
import { useProgramContext } from "@utils/store.js";
import Dropdown from "@components/Dropdown.jsx";

const BindingMenu = ({ bindingId }) => {
  const { empty, nameExpression, deleteBinding, duplicateBinding } =
    useProgramContext((state) => ({
      empty: !state.getBindingExpression(bindingId).length,
      nameExpression: state.nameExpression,
      deleteBinding: state.deleteBinding,
      duplicateBinding: state.duplicateBinding,
    }));

  const items = [
    bindingId != null && {
      icon: <Trash size={16} className="text-gray-500" />,
      text: "Delete",
      onClick: () => deleteBinding(bindingId),
    },
    bindingId != null && {
      icon: <Copy size={16} className="text-gray-500" />,
      text: "Duplicate",
      onClick: () => duplicateBinding(bindingId),
    },
    bindingId == null &&
      !empty && {
        icon: <PuzzlePiece size={16} className="text-gray-500" />,
        text: "As named expression",
        onClick: () => nameExpression(),
      },
  ].filter(Boolean);

  return items.length > 0 ? (
    <Dropdown
      items={items}
      renderReference={(mergeProps, ref) => (
        <button
          ref={ref}
          {...mergeProps({
            className:
              "flex items-center justify-center cursor-pointer rounded py-1 text-gray-400 focus:outline-blue-500 data-[dragging]:cursor-grabbing data-[dragging]:bg-gray-200",
          })}
        >
          <DotsThreeVertical size={16} weight="bold" />
        </button>
      )}
      renderItem={({ icon, text }) => (
        <>
          {icon} {text}
        </>
      )}
      onClick={({ onClick }) => onClick()}
    />
  ) : (
    <span />
  );
};

export default BindingMenu;
