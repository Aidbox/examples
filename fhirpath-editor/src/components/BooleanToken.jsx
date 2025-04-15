import React from "react";
import { useProgramContext } from "@utils/store.js";
import { CheckSquare, Square } from "@phosphor-icons/react";

const BooleanToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const isChecked = token.value === "true";

  return (
    <label
      ref={ref}
      className="focus-within:bg-gray-100 focus-within:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded text-green-800 appearance-none flex items-center gap-1 select-none cursor-pointer"
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, {
            value: e.target.checked ? "true" : "false",
          })
        }
      />
      {isChecked ? (
        <CheckSquare size={18} weight="bold" className="text-green-800" />
      ) : (
        <Square size={18} weight="regular" className="text-gray-400" />
      )}
      {token.value}
    </label>
  );
});

export default BooleanToken;
