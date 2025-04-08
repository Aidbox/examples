import React from "react";

import { findCompatibleOperators } from "@utils/expression.js";
import { useContextType } from "@utils/react.js";

// Group operators by category for better organization in the dropdown
const operatorGroups = {
  "Math Operators": ["+", "-", "*", "/", "mod", "div"],
  "Comparison Operators": ["=", "==", "!=", "<", ">", "<=", ">=", "~", "!~"],
  "Logical Operators": ["and", "or", "xor", "implies"],
  "Collection Operators": ["in", "contains", "&", "|"],
  "Type Operators": ["is", "as"],
};

const OperatorToken = React.forwardRef(
  ({ token, onChange, expression, bindings }, ref) => {
    const contextType = useContextType();
    const compatibleOperators = findCompatibleOperators(
      [expression[0]],
      bindings,
      contextType
    );

    const invalid = !compatibleOperators.find((op) => op === token.value);

    return (
      <select
        ref={ref}
        className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-yellow-800 appearance-none"
        value={token.value}
        onChange={(e) => onChange({ ...token, value: e.target.value })}
      >
        {invalid && (
          <option value={token.value} disabled>
            ⚠️ {token.value}
          </option>
        )}

        {/* Render operators by category */}
        {Object.entries(operatorGroups).map(([groupName, operators]) => {
          // Filter operators by compatibility
          const groupOperators = operators.filter((op) =>
            compatibleOperators.includes(op)
          );

          // Only render group if it has compatible operators
          if (groupOperators.length === 0) return null;

          return (
            <optgroup key={groupName} label={groupName}>
              {groupOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    );
  }
);

export default OperatorToken;
