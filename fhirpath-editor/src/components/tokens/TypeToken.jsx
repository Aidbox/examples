import React from "react";
import { types } from "../../utils/types";

const TypeToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;

  return (
    <select
      ref={ref}
      className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-teal-700 appearance-none data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300"
      data-testid="type-token"
      data-empty={empty || undefined}
      value={token.value || ""}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    >
      {types.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  );
});

export default TypeToken;
