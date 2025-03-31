import React from "react";
import { findCompatibleOperators } from "../../utils/types";

const OperatorToken = React.forwardRef(
  ({ token, onChange, expression, bindings }, ref) => {
    const compatibleOperators = findCompatibleOperators(bindings, [
      expression[0],
    ]);

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
        {compatibleOperators.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    );
  }
);

export default OperatorToken;
