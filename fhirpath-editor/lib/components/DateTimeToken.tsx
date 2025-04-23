import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IDateTimeToken, TokenComponentProps } from "../types/internal";

const DateTimeToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IDateTimeToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 w-[16ch]"
        placeholder="YYYY-MM-DDThh:mm:ss"
        type="datetime-local"
        value={token.value}
        onFocus={(e) => e.target.showPicker()}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
    );
  },
);

export default DateTimeToken;
