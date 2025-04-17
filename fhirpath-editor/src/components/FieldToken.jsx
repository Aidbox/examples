import React, { Fragment } from "react";
import { useProgramContext } from "@utils/store.js";
import { mergeRefs, useDebug } from "@utils/react.js";
import { Shapes } from "@phosphor-icons/react";

import { stringifyType } from "@utils/stringify.js";
import Dropdown from "@components/Dropdown.jsx";

const FieldToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, isLeadingToken, updateToken, suggestTokensAt } =
      useProgramContext((state) => ({
        token: state.getToken(bindingId, tokenIndex),
        isLeadingToken: state.isLeadingToken,
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
      }));

    const tokens = suggestTokensAt(bindingId, tokenIndex);
    const debug = useDebug();

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
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600`,
            })}
          >
            {isLeadingToken ? "" : "."}
            {token.value}
          </button>
        )}
        renderItem={(token) => (
          <>
            <Shapes size={16} className="text-gray-500 flex-shrink-0" />
            <span className="truncate">{token.value}</span>
            {debug && (
              <span className="text-sm text-gray-500 truncate flex-1 text-right">
                {stringifyType(token.debug)}
              </span>
            )}
          </>
        )}
      />
    );
  },
);

export default FieldToken;
