import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { mergeRefs } from "../utils/react";
import { Shapes } from "@phosphor-icons/react";

import Dropdown from "./Dropdown";
import { IFieldToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";
import { colors } from "../utils/misc.ts";

const FieldToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const style = useStyle();
    const { token, isLeadingToken, updateToken, suggestTokensAt, debug } =
      useProgramContext((state) => ({
        token: state.getToken(bindingId, tokenIndex) as IFieldToken,
        isLeadingToken: state.isLeadingToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
        debug: state.getDebug(),
      }));

    const tokens = suggestTokensAt<IFieldToken>(bindingId, tokenIndex);

    return (
      <Dropdown
        items={tokens}
        searchFn={(token, term) =>
          token.value.toLowerCase().includes(term.toLowerCase())
        }
        keyFn={(token) => token.value}
        onClick={(token) => {
          updateToken(bindingId, tokenIndex, { value: token.value });
        }}
        colorFn={() => colors.field}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
            {...mergeProps({ className: style.token.button })}
          >
            {isLeadingToken ? "" : "."}
            {token.value}
          </button>
        )}
        renderItem={(token) => (
          <>
            <span className={style.dropdown.icon}>
              <Shapes size={14} />
            </span>
            <span className={style.dropdown.primary}>{token.value}</span>
            {debug && (
              <span className={style.dropdown.secondary}>{token.debug}</span>
            )}
          </>
        )}
      />
    );
  },
);

export default FieldToken;
