import React from "react";

const NumberToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;
  return (
    <input
      ref={ref}
      className="focus:bg-gray-100 not-data-[empty]:focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-blue-800 tabular-nums data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300 placeholder:text-gray-400"
      data-empty={empty || undefined}
      placeholder="0"
      type="number"
      value={token.value}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    />
  );
});

export default NumberToken;
