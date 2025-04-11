import React from "react";

import { useProgramContext } from "@utils/store.jsx";
import { suggestOperatorsForLeftType } from "@utils/operator.js";

const operatorGroups = {
  "Math Operators": ["+", "-", "*", "/", "mod", "div"],
  "Comparison Operators": ["=", "==", "!=", "<", ">", "<=", ">=", "~", "!~"],
  "Logical Operators": ["and", "or", "xor", "implies"],
  "Collection Operators": ["in", "contains", "&", "|"],
  "Type Operators": ["is", "as"],
};

const OperatorToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const compatibleOperators = suggestOperatorsForLeftType(
    precedingExpressionType,
  );

  const invalid = !compatibleOperators.find((op) => op === token.value);

  return (
    <select
      ref={ref}
      className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-yellow-800 appearance-none"
      value={token.value}
      onChange={(e) =>
        updateToken(bindingId, tokenIndex, { value: e.target.value })
      }
    >
      {invalid && (
        <option value={token.value} disabled>
          ⚠️ {token.value}
        </option>
      )}

      {Object.entries(operatorGroups).map(([groupName, operators]) => {
        const groupOperators = operators.filter((op) =>
          compatibleOperators.includes(op),
        );

        return (
          groupOperators.length > 0 && (
            <optgroup key={groupName} label={groupName}>
              {groupOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </optgroup>
          )
        );
      })}
    </select>
  );
});

export default OperatorToken;
