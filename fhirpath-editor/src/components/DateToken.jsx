import React from "react";
import { useProgramContext } from "@utils/store.js";

const DateToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  return (
    <input
      ref={ref}
      data-testid="date-token"
      className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 w-[10ch]"
      placeholder="YYYY-MM-DD"
      type="date"
      value={token.value}
      onFocus={(e) => e.target.showPicker()}
      onChange={(e) =>
        updateToken(bindingId, tokenIndex, { value: e.target.value })
      }
    />
  );
});

export default DateToken;
