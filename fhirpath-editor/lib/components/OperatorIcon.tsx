import {
  Calculator,
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
  compact?: boolean;
  className?: string;
};

const OperatorIcon = ({
  name,
  compact = true,
  className,
}: OperatorIconProps) => (
  <span className={`text-center ${className || ""}`}>
    {operatorIcons[name] ? (
      createElement(operatorIcons[name], {
        size: 16,
        className: "text-gray-500",
      })
    ) : compact ? (
      !name.match(/[a-z]/) ? (
        <span className="font-thin">{name}</span>
      ) : (
        <Calculator size={16} className="text-gray-500" />
      )
    ) : (
      name
    )}
  </span>
);

export default OperatorIcon;
