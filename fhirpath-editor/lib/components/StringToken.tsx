import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IStringToken, TokenComponentProps } from "../types/internal";

const StringToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IStringToken,
      updateToken: state.updateToken,
    }));

    return (
      <label className="flex items-center px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 min-w-7 justify-center">
        <span className="select-none">"</span>
        <input
          ref={ref as Ref<HTMLInputElement>}
          className="focus:outline-none field-sizing-content"
          type="text"
          value={token.value}
          onChange={(e) =>
            updateToken(bindingId, tokenIndex, { value: e.target.value })
          }
        />
        <span className="select-none">"</span>
      </label>
    );
  },
);

export default StringToken;
