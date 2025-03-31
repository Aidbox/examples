import React from "react";

const DateTimeToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;
  return (
    <input
      ref={ref}
      data-testid="datetime-token"
      className="focus:bg-gray-100 not-data-[empty]:focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded w-[16ch] text-violet-800 tabular-nums data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300 placeholder:text-gray-400"
      data-empty={empty || undefined}
      placeholder="YYYY-MM-DDThh:mm:ss"
      type="datetime-local"
      value={token.value}
      onFocus={(e) => e.target.showPicker()}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    />
  );
});

export default DateTimeToken;
