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
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-green-50 border border-slate-300 text-green-800 min-w-7`,
            })}
          >
            {token.value}
          </button>
        )}
        renderItem={(token, created) =>
          created ? (
            <>
              <Plus size={16} className="text-gray-500" />
              New named expression
            </>
          ) : (
            <>
              <PuzzlePiece size={16} className="text-gray-500 shrink-0" />
              <span className="truncate">{token.value}</span>
              {debug && (
                <span className="text-sm text-gray-500 truncate flex-1 text-right">
                  {token.debug}
                </span>
              )}
            </>
          )
        }
      />
    );
  },
);

export default VariableToken;
