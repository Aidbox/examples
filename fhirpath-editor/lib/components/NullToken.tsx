import { forwardRef, Ref } from "react";
import { TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const NullToken = forwardRef<HTMLElement, TokenComponentProps>(
  (_props, ref) => {
    const style = useStyle();
    return (
      <label
        ref={ref as Ref<HTMLLabelElement>}
        className={style.token.null.button}
      >
        empty
      </label>
    );
  },
);

export default NullToken;
