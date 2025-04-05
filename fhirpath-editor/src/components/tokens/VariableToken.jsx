import React from "react";

import { findCompatibleVariables } from "../../utils/expression.js";

const VariableToken = React.forwardRef(
  ({ token, onChange, bindings, expression }, ref) => {
    // Filter bindings based on compatibility and position
    const compatibleBindings = findCompatibleVariables(bindings, expression);
    const externalBindings = compatibleBindings.filter(
      ({ expression }) => !expression
    );
    const localBindings = compatibleBindings.filter(
      ({ expression }) => expression
    );
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
        {externalBindings.length > 0 && (
          <optgroup label="Global">
            {externalBindings.map((binding) => (
              <option key={binding.id || binding.name} value={binding.name}>
                {binding.name}
              </option>
            ))}
          </optgroup>
        )}
        {localBindings.length > 0 && (
          <optgroup label="Local">
            {localBindings.map((binding) => (
              <option key={binding.id || binding.name} value={binding.name}>
                {binding.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    );
  }
);

export default VariableToken;
