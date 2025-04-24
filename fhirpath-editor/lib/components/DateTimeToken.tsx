import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IDateTimeToken, TokenComponentProps } from "../types/internal";
import { input } from "./DateTimeToken.module.css";

const DateTimeToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IDateTimeToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className={input}
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
