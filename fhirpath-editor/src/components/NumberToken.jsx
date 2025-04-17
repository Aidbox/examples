import React from "react";
import { useProgramContext } from "@utils/store.js";

const NumberToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  return (
    <input
      ref={ref}
      data-testid="number-token"
      className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 field-sizing-content min-w-8 text-center"
      type="text"
      pattern="-?[0-9]*\.?[0-9]*"
      inputMode="decimal"
      value={token.value}
      onChange={(e) =>
        updateToken(bindingId, tokenIndex, { value: e.target.value })
      }
    />
  );
});

export default NumberToken;
