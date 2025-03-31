import React from "react";
import { findCompatibleVariables } from "../../utils/types";

const VariableToken = React.forwardRef(
  ({ token, onChange, bindings, expression }, ref) => {
    // Filter bindings based on compatibility and position
    const compatibleBindings = findCompatibleVariables(bindings, expression);

    const invalid = !compatibleBindings.find(
      ({ name }) => name === token.value
    );

    return (
      <select
        ref={ref}
        className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-green-800 appearance-none"
        data-invalid={invalid || undefined}
        value={token.value}
        onChange={(e) => onChange({ ...token, value: e.target.value })}
      >
        {invalid && (
          <option value={token.value} disabled>
            ⚠️ {token.value}
          </option>
        )}
        {compatibleBindings.map((binding) => (
          <option key={binding.id || binding.name} value={binding.name}>
            {binding.name}
          </option>
        ))}
      </select>
    );
  }
);

export default VariableToken;
