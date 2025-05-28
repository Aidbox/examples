import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IDateToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const DateToken = forwardRef<HTMLElement, TokenComponentProps>(
  function DateToken({ bindingId, tokenIndex }, ref) {
    const style = useStyle();
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IDateToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className={style.token.date.input}
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
