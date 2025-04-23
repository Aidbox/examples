import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IIndexToken, TokenComponentProps } from "../types/internal";

const IndexToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IIndexToken,
      updateToken: state.updateToken,
    }));

    return (
      <label className="flex items-center px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 gap-[0.125rem] min-w-8 justify-center">
        <span className="select-none">[</span>
        <input
          ref={ref as Ref<HTMLInputElement>}
          className="focus:outline-none field-sizing-content"
          type="text"
          pattern="[0-9]*"
          value={token.value}
          onChange={(e) =>
            updateToken(bindingId, tokenIndex, { value: e.target.value })
          }
        />
        <span className="select-none">]</span>
      </label>
    );
  },
);

export default IndexToken;
