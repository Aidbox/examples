import React from "react";
import { useProgramContext } from "@/utils/store";
import { mergeRefs, useDebug } from "@/utils/react";
import { Shapes } from "@phosphor-icons/react";

import Dropdown from "@/components/Dropdown";
import { IFieldToken, ITokenComponentProps } from "@/types/internal";

const FieldToken = React.forwardRef<HTMLElement, ITokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, isLeadingToken, updateToken, suggestTokensAt } =
      useProgramContext((state) => ({
        token: state.getToken(bindingId, tokenIndex) as IFieldToken,
        isLeadingToken: state.isLeadingToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
      }));

    const tokens = suggestTokensAt<IFieldToken>(bindingId, tokenIndex);
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
            ref={mergeRefs(forwardedRef as React.Ref<HTMLButtonElement>, ref)}
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
                {token.debug}
              </span>
            )}
          </>
        )}
      />
    );
  },
);

export default FieldToken;
