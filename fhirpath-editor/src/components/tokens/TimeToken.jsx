import React from "react";

const TimeToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;
  return (
    <input
      ref={ref}
      data-testid="time-token"
      className="focus:bg-gray-100 not-data-[empty]:focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded text-teal-800 tabular-nums data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300 placeholder:text-gray-400"
      data-empty={empty || undefined}
      placeholder="hh:mm:ss"
      type="time"
      value={token.value}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    />
  );
});

export default TimeToken;
