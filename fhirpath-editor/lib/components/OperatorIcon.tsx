import {
  Command,
  Divide,
  Equals,
  GreaterThan,
  GreaterThanOrEqual,
  Icon,
  LessThan,
  LessThanOrEqual,
  LineVertical,
  Minus,
  NotEquals,
  Plus,
  X,
} from "@phosphor-icons/react";
import { createElement } from "react";

import { OperatorName } from "../types/internal";
import clx from "classnames";
import { useStyle } from "../style";

const operatorIcons: Partial<Record<OperatorName, Icon>> = {
  "+": Plus,
  "-": Minus,
  "*": X,
  "/": Divide,
  "=": Equals,
  "!=": NotEquals,
  "<": LessThan,
  "<=": LessThanOrEqual,
  ">": GreaterThan,
  ">=": GreaterThanOrEqual,
  "|": LineVertical,
};

type OperatorIconProps = {
  name: OperatorName;
  size?: number;
  compact?: boolean;
  className?: string;
};

const OperatorIcon = ({
  name,
  size = 16,
  compact = true,
  className,
}: OperatorIconProps) => {
  const style = useStyle();
  return (
    <span className={clx(style.token.operator.icon.wrapper, className)}>
      {operatorIcons[name] ? (
        createElement(operatorIcons[name], { size })
      ) : compact ? (
        !name.match(/[a-z]/) ? (
          <span className={style.token.operator.icon.letter}>{name}</span>
        ) : (
          <Command size={size} />
        )
      ) : (
        name
      )}
    </span>
  );
};

export default OperatorIcon;
