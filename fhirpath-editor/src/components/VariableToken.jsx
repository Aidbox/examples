import React, { Fragment } from "react";

import { useProgramContext } from "@utils/store.js";
import { mergeRefs, useDebug } from "@utils/react.js";
import { stringifyType } from "@utils/stringify.js";
import { Plus, PuzzlePiece } from "@phosphor-icons/react";
import Dropdown from "@components/Dropdown.jsx";

const VariableToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const debug = useDebug();

    const {
      bindingIndex,
      token,
      updateToken,
      isBindingNameUnique,
      addBinding,
      getBindingExpressionType,
    } = useProgramContext((state) => ({
      bindingIndex: state.bindingsIndex[bindingId],
      token: state.getToken(bindingId, tokenIndex),
      updateToken: state.updateToken,
      addBinding: state.addBinding,
      isBindingNameUnique: state.isBindingNameUnique,
      getBindingExpressionType: state.getBindingExpressionType,
    }));

    const compatibleBindings = useProgramContext((state) =>
      state.getCompatibleBindings(bindingId, tokenIndex),
    );

    return (
      <Dropdown
        items={compatibleBindings}
        searchFn={(binding, term) =>
          binding.name.toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(binding) => (binding.expression?.length ? "Local" : "Global")}
        keyFn={(binding) => binding.id || binding.name}
        createFn={(term) =>
          isBindingNameUnique(term, bindingId) && { name: term, new: true }
        }
        onClick={(binding) => {
          if (binding.new) {
            addBinding({ name: binding.name }, bindingIndex, false);
          }
          updateToken(bindingId, tokenIndex, { value: binding.name });
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
        renderItem={(binding) =>
          binding.new ? (
            <>
              <Plus size={16} className="text-gray-500" />
              New named expression
            </>
          ) : (
            <>
              <PuzzlePiece size={16} className="text-gray-500 shrink-0" />
              <span className="truncate">{binding.name}</span>
              {debug && (
                <span className="text-sm text-gray-500 truncate flex-1 text-right">
                  {stringifyType(getBindingExpressionType(binding.id))}
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
