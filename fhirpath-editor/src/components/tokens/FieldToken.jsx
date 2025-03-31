import React from "react";
import { getExpressionType, typeDefinitions } from "../../utils/types";

const FieldToken = React.forwardRef(
  ({ token, onChange, bindings, expression, deleting }, ref) => {
    const fields = Object.keys(
      typeDefinitions[getExpressionType(expression.slice(0, -1), bindings)] ||
        {}
    );

    const invalid = !fields.find((field) => field === token.value);

    return (
      <label className="relative token" data-testid="field-token">
        <div
          className="absolute left-0 top-1/2 -ml-0.25 mt-0.25 -translate-y-1/2 -translate-x-1/2 w-[0.2rem] h-[0.2rem] rounded-full bg-gray-400 outline outline-white data-[deleting]:hidden pointer-events-none"
          data-testid="field-token-dot"
          data-deleting={deleting || undefined}
        ></div>
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
          {fields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </label>
    );
  }
);

export default FieldToken;
