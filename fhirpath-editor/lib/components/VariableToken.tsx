import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { mergeRefs } from "../utils/react";
import { Plus, PuzzlePiece, CurrencyDollar } from "@phosphor-icons/react";
import Dropdown from "./Dropdown";
import {
  IVariableToken,
  TokenComponentProps,
  TokenType,
} from "../types/internal";
import { useStyle } from "../style";
import { useText } from "../text";
import { colors } from "../utils/misc.ts";

const VariableToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const style = useStyle();
    const text = useText();
    const {
      bindingIndex,
      token,
      updateToken,
      addBinding,
      suggestTokensAt,
      isBindingNameUnique,
      getBindingExpression,
      debug,
    } = useProgramContext((state) => ({
      bindingIndex: state.bindingsIndex[`${bindingId}`],
      token: state.getToken(bindingId, tokenIndex) as IVariableToken,
      updateToken: state.updateToken,
      addBinding: state.addBinding,
      suggestTokensAt: state.suggestTokensAt,
      isBindingNameUnique: state.isBindingNameUnique,
      getBindingExpression: state.getBindingExpression,
      debug: state.getDebug(),
    }));

    const tokens = suggestTokensAt<IVariableToken>(bindingId, tokenIndex);

    return (
      <Dropdown
        items={tokens}
        searchFn={(token, term) =>
          token.value.toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(token) =>
          getBindingExpression(token.value)?.length ? "Local" : "Global"
        }
        keyFn={(token) => token.value}
        createFn={(term) =>
          isBindingNameUnique(term, bindingId)
            ? { type: TokenType.variable as const, value: term }
            : undefined
        }
        onClick={(token, created) => {
          if (created) {
            addBinding({ name: token.value }, bindingIndex, false);
          }
          updateToken(bindingId, tokenIndex, { value: token.value });
        }}
        colorFn={() => colors.variable}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
            {...mergeProps({ className: style.token.button })}
          >
            {token.special && <CurrencyDollar />}
            <span>{token.value}</span>
          </button>
        )}
        renderItem={(token, created) =>
          created ? (
            <>
              <Plus size={16} className={style.dropdown.icon} />
              <span className={style.dropdown.primary}>
                {text.token.answer.newExpression}
              </span>
            </>
          ) : (
            <>
              <span className={style.dropdown.icon}>
                <PuzzlePiece size={14} />
              </span>
              <span className={style.dropdown.primary}>{token.value}</span>
              {debug && (
                <span className={style.dropdown.secondary}>{token.debug}</span>
              )}
            </>
          )
        }
      />
    );
  },
);

export default VariableToken;
