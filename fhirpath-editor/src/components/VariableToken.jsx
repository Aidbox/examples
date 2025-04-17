import React, { Fragment } from "react";

import { useProgramContext } from "@utils/store.js";
import { mergeRefs, useDebug } from "@utils/react.js";
import { stringifyType } from "@utils/stringify.js";
import { Plus, PuzzlePiece } from "@phosphor-icons/react";
import Dropdown from "@components/Dropdown.jsx";

const VariableToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const {
      bindingIndex,
      token,
      updateToken,
      addBinding,
      suggestTokensAt,
      isBindingNameUnique,
      getBindingExpression,
    } = useProgramContext((state) => ({
      bindingIndex: state.bindingsIndex[bindingId],
      token: state.getToken(bindingId, tokenIndex),
      updateToken: state.updateToken,
      addBinding: state.addBinding,
      suggestTokensAt: state.suggestTokensAt,
      isBindingNameUnique: state.isBindingNameUnique,
      getBindingExpression: state.getBindingExpression,
    }));

    const tokens = suggestTokensAt(bindingId, tokenIndex);
    const debug = useDebug();

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
          isBindingNameUnique(term, bindingId) && { value: term, new: true }
        }
        onClick={(token) => {
          if (token.new) {
            addBinding({ name: token.value }, bindingIndex, false);
          }
          updateToken(bindingId, tokenIndex, { value: token.value });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-green-50 border border-slate-300 text-green-800`,
            })}
          >
            {token.value}
          </button>
        )}
        renderItem={(token) =>
          token.new ? (
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
