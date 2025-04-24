import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { CheckSquare, Square } from "@phosphor-icons/react";
import { IBooleanToken, TokenComponentProps } from "../types/internal";
import { checkbox } from "./Boolean.module.css";

const BooleanToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IBooleanToken,
      updateToken: state.updateToken,
    }));

    const isChecked = token.value === "true";

    return (
      <label ref={ref as Ref<HTMLLabelElement>} className={checkbox}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) =>
            updateToken(bindingId, tokenIndex, {
              value: e.target.checked ? "true" : "false",
            })
          }
        />
        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
        {token.value}
      </label>
    );
  },
);

export default BooleanToken;
