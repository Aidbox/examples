import React from "react";
import { useProgramContext } from "@/utils/store";
import { ITimeToken, ITokenComponentProps } from "@/types/internal";

const TimeToken = React.forwardRef<HTMLElement, ITokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as ITimeToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        data-testid="time-token"
        className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600"
        placeholder="hh:mm:ss"
        type="time"
        value={token.value}
        onFocus={(e) => e.target.showPicker()}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
    );
  },
);

export default TimeToken;
