import {
  Copy,
  DotsThreeVertical,
  PuzzlePiece,
  Trash,
} from "@phosphor-icons/react";
import { ReactNode } from "react";
import { useProgramContext } from "../utils/store";
import Dropdown from "./Dropdown";

type BindingMenuProps = {
  bindingId: string;
};

const BindingMenu = ({ bindingId }: BindingMenuProps) => {
  const { empty, nameExpression, deleteBinding, duplicateBinding } =
    useProgramContext((state) => ({
      empty: !state.getBindingExpression(bindingId).length,
      nameExpression: state.nameExpression,
      deleteBinding: state.deleteBinding,
      duplicateBinding: state.duplicateBinding,
    }));

  const items = [
    bindingId && {
      icon: <Trash size={16} className="text-gray-500" />,
      text: "Delete",
      onClick: () => deleteBinding(bindingId),
    },
    bindingId && {
      icon: <Copy size={16} className="text-gray-500" />,
      text: "Duplicate",
      onClick: () => duplicateBinding(bindingId),
    },
    !bindingId &&
      !empty && {
        icon: <PuzzlePiece size={16} className="text-gray-500" />,
        text: "As named expression",
        onClick: () => nameExpression(),
      },
  ].filter(Boolean) as {
    icon: ReactNode;
    text: string;
    onClick: () => void;
  }[];

  return items.length > 0 ? (
    <Dropdown
      items={items}
      renderReference={(mergeProps, ref) => (
        <button
          ref={ref}
          {...mergeProps({
            className:
              "flex items-center justify-center rounded text-gray-400 focus:outline-none self-stretch w-fit cursor-pointer hover:bg-gray-200",
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
