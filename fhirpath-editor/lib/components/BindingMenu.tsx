import {
  Copy,
  DotsThreeVertical,
  PuzzlePiece,
  Trash,
} from "@phosphor-icons/react";
import { ReactNode } from "react";
import { useProgramContext } from "../utils/store";
import Dropdown from "./Dropdown";
import { useStyle } from "../style";
import { useText } from "../text";

type BindingMenuProps = {
  bindingId: string;
};

const BindingMenu = ({ bindingId }: BindingMenuProps) => {
  const style = useStyle();
  const text = useText();
  const { empty, nameExpression, deleteBinding, duplicateBinding } =
    useProgramContext((state) => ({
      empty: !state.getBindingExpression(bindingId).length,
      nameExpression: state.nameExpression,
      deleteBinding: state.deleteBinding,
      duplicateBinding: state.duplicateBinding,
    }));

  const items = [
    bindingId && {
      icon: <Trash size={16} className={style.binding.menu.icon} />,
      text: text.binding.menu.delete,
      onClick: () => deleteBinding(bindingId),
    },
    bindingId && {
      icon: <Copy size={16} className={style.binding.menu.icon} />,
      text: text.binding.menu.duplicate,
      onClick: () => duplicateBinding(bindingId),
    },
    !bindingId &&
      !empty && {
        icon: <PuzzlePiece size={16} className={style.binding.menu.icon} />,
        text: text.binding.menu.asNamedExpression,
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
          {...mergeProps({ className: style.binding.menu.button })}
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
