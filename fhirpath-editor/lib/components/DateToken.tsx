import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IDateToken, TokenComponentProps } from "../types/internal";

const DateToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IDateToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
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
  },
);

export default DateToken;
