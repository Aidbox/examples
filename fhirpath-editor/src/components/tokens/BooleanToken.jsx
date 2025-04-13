import React from "react";
import { useProgramContext } from "@utils/store.jsx";

const BooleanToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));
  return (
    <label
      ref={ref}
      className="focus-within:bg-gray-100 focus-within:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded text-green-800 appearance-none flex items-center gap-1 select-none"
    >
      <input
        type="checkbox"
        className="focus:outline-none"
        checked={token.value === "true"}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, {
            value: e.target.checked ? "true" : "false",
          })
        }
      />

      {token.value}
    </label>
  );
});

export default BooleanToken;
