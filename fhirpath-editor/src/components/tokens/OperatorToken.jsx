import React from "react";
import { calculateResultType } from "../../utils/typeSystem";
import { operatorTypes } from "../../utils/typeSystem";

const OperatorToken = React.forwardRef(
  ({ token, onChange, currentExpression, bindings }, ref) => {
    // Filter operators based on the left operand type
    const leftOperand = currentExpression[0];
    const leftType = calculateResultType([leftOperand], bindings);

    // Get compatible operators
    const compatibleOperators = Object.keys(operatorTypes).filter(
      (op) => operatorTypes[op]?.[leftType] !== undefined
    );

    return (
      <select
        ref={ref}
        className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-yellow-800 appearance-none"
        value={token.value}
        onChange={(e) => onChange({ ...token, value: e.target.value })}
      >
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
