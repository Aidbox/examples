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
      className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 flex items-center gap-1 select-none"
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
      {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
      {token.value}
    </label>
  );
});

export default BooleanToken;
