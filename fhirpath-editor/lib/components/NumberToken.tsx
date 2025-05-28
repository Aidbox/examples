import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { INumberToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const NumberToken = forwardRef<HTMLElement, TokenComponentProps>(
  function NumberToken({ bindingId, tokenIndex }, ref) {
    const style = useStyle();
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as INumberToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className={style.token.number.input}
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
