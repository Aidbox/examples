import React from "react";

const BooleanToken = React.forwardRef(({ token, onChange }, ref) => {
  return (
    <select
      ref={ref}
      data-testid="boolean-token"
      className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-green-800 appearance-none"
      value={token.value || "true"}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  );
});

export default BooleanToken;
