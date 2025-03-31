import React from "react";

const NumberToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;

  // Determine if the value is an integer or a decimal
  const isInteger = token.value === "" || !token.value.includes(".");
  const textColor = isInteger ? "text-blue-800" : "text-indigo-800";

  return (
    <input
      ref={ref}
      data-testid="number-token"
      className={`focus:bg-gray-100 not-data-[empty]:focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content ${textColor} tabular-nums data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300 placeholder:text-gray-400`}
      data-empty={empty || undefined}
      placeholder="0"
      type="text"
      pattern="-?[0-9]*\.?[0-9]*"
      inputMode="decimal"
      value={token.value}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    />
  );
});

export default NumberToken;
