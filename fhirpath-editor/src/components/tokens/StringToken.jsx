import React from "react";
import { useProgramContext } from "@utils/store.jsx";

const StringToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const empty = !token.value;
  return (
    <label
      data-testid="string-token"
      className="flex items-center focus-within:bg-gray-100 hover:outline hover:outline-gray-300 px-1 py-0.5 rounded data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300"
      data-empty={empty || undefined}
    >
      <span
        className="text-orange-800 opacity-75 data-[empty]:text-gray-400 select-none"
        data-empty={empty || undefined}
      >
        "
      </span>
      <input
        ref={ref}
        className="focus:outline-none field-sizing-content text-orange-800"
        type="text"
        value={token.value}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
      <span
        className="text-orange-800 opacity-75 data-[empty]:text-gray-400 select-none"
        data-empty={empty || undefined}
      >
        "
      </span>
    </label>
  );
});

export default StringToken;
