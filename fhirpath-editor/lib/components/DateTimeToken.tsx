import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { IDateTimeToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const DateTimeToken = forwardRef<HTMLElement, TokenComponentProps>(
  function DateTimeToken({ bindingId, tokenIndex }, ref) {
    const style = useStyle();
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IDateTimeToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className={style.token.dateTime.input}
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
