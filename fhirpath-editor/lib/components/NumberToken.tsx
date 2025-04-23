import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { INumberToken, TokenComponentProps } from "../types/internal";

const NumberToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as INumberToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 field-sizing-content min-w-7 text-center"
        type="text"
        pattern="-?[0-9]*\.?[0-9]*"
        inputMode="decimal"
        value={token.value}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
    );
  },
);

export default NumberToken;
