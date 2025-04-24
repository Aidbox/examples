import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { mergeRefs } from "../utils/react";
import { Plus, PuzzlePiece } from "@phosphor-icons/react";
import Dropdown from "./Dropdown";
import {
  IVariableToken,
  TokenComponentProps,
  TokenType,
} from "../types/internal";
import { button } from "./Token.module.css";
import { icon, primary, secondary } from "./Dropdown.module.css";

const VariableToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
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
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
            {...mergeProps({ className: button })}
          >
            {token.value}
          </button>
        )}
        renderItem={(token, created) =>
          created ? (
            <>
              <Plus size={16} className={icon} />
              <span className={primary}>New named expression</span>
            </>
          ) : (
            <>
              <PuzzlePiece size={16} className={icon} />
              <span className={primary}>{token.value}</span>
              {debug && <span className={secondary}>{token.debug}</span>}
            </>
          )
        }
      />
    );
  },
);

export default VariableToken;
