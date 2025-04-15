import {
  Calculator,
  Divide,
  Equals,
  GreaterThan,
  GreaterThanOrEqual,
  LessThan,
  LessThanOrEqual,
  Minus,
  NotEquals,
  Plus,
  X,
} from "@phosphor-icons/react";
import React, { createElement } from "react";

const operatorIcons = {
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
};

const OperatorIcon = ({ name, compact = true }) => (
  <span className="text-center">
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
