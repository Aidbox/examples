import React from "react";
import { getExpressionType } from "../../utils/expression.js";
import { getFields } from "../../utils/fhir-type";

const FieldToken = React.forwardRef(
  ({ token, onChange, bindings, expression }, ref) => {
    const fields = getFields(
      getExpressionType(expression.slice(0, -1), bindings),
    );
    const invalid = fields[token.value] === undefined;

    return (
      <label className="relative token" data-testid="field-token">
        <select
          ref={ref}
          className="token-field focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-purple-800 appearance-none"
          value={token.value}
          onChange={(e) => onChange({ ...token, value: e.target.value })}
        >
          {invalid && (
            <option value={token.value} disabled>
              ⚠️ {token.value}
            </option>
          )}
          {Object.keys(fields).map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </label>
    );
  },
);

export default FieldToken;
