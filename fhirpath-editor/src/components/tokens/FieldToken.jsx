import React from "react";
import { typeDefinitions } from "../../utils/typeSystem";

const FieldToken = React.forwardRef(
  ({ token, onChange, bindings, prevTokens }, ref) => {
    // Find the parent variable or field
    let parentVariable = null;
    let currentType = null;

    if (prevTokens.length > 0) {
      if (prevTokens[0].type === "variable") {
        parentVariable = prevTokens[0].value;
        // Find the binding and its type
        const binding = bindings.find((b) => b.name === parentVariable);
        if (binding && binding.type) {
          currentType = binding.type;

          // If we have more than one token, follow the field chain
          for (let i = 1; i < prevTokens.length; i++) {
            if (prevTokens[i].type === "field") {
              const fieldType =
                typeDefinitions[currentType][prevTokens[i].field];
              currentType = fieldType;
            }
          }
        }
      }
    }

    // Get available fields for this type
    const fields = currentType ? Object.keys(typeDefinitions[currentType]) : [];

    return (
      <select
        ref={ref}
        className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-purple-800 appearance-none"
        value={token.field}
        onChange={(e) => onChange({ ...token, field: e.target.value })}
      >
        {fields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    );
  }
);

export default FieldToken;
