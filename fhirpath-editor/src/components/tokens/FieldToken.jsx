import React from "react";
import { getFields } from "@utils/fhir-type";
import { useProgramContext } from "@utils/store.jsx";

const FieldToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const fields = getFields(precedingExpressionType);
  const invalid = fields[token.value] === undefined;

  return (
    <label className="relative token" data-testid="field-token">
      <select
        ref={ref}
        className="token-field focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-purple-800 appearance-none"
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
        {Object.keys(fields).map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </label>
  );
});

export default FieldToken;
