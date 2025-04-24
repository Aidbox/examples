import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IIndexToken, TokenComponentProps } from "../types/internal";
import { wrapper } from "./IndexToken.module.css";

const IndexToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IIndexToken,
      updateToken: state.updateToken,
    }));

    return (
      <label className={wrapper}>
        <span>[</span>
        <input
          ref={ref as Ref<HTMLInputElement>}
          type="text"
          pattern="[0-9]*"
          value={token.value}
          onChange={(e) =>
            updateToken(bindingId, tokenIndex, { value: e.target.value })
          }
        />
        <span>]</span>
      </label>
    );
  },
);

export default IndexToken;
