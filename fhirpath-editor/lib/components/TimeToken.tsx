import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { ITimeToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const TimeToken = forwardRef<HTMLElement, TokenComponentProps>(
  function TimeToken({ bindingId, tokenIndex }, ref) {
    const style = useStyle();
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as ITimeToken,
      updateToken: state.updateToken,
    }));

    return (
      <input
        ref={ref as Ref<HTMLInputElement>}
        className={style.token.time.input}
        placeholder="hh:mm:ss"
        type="time"
        value={token.value}
        onFocus={(e) => e.target.showPicker()}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
    );
  },
);

export default TimeToken;
