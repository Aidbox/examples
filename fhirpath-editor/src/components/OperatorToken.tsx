import React from "react";

import { useProgramContext } from "@/utils/store";
import { operatorGroups, operatorNames } from "@/utils/operator";
import OperatorIcon from "@/components/OperatorIcon";
import Dropdown from "@/components/Dropdown";
import { mergeRefs } from "@/utils/react";
import { IOperatorToken, ITokenComponentProps } from "@/types/internal";

const OperatorToken = React.forwardRef<HTMLElement, ITokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, suggestTokensAt } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex) as IOperatorToken,
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
      }),
    );

    const tokens = suggestTokensAt<IOperatorToken>(bindingId, tokenIndex);

    return (
      <Dropdown
        items={tokens}
        searchFn={(token, term) =>
          operatorNames[token.value]
            .toLowerCase()
            .includes(term.toLowerCase()) ||
          token.value.toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(token) =>
          Object.keys(operatorGroups).find((groupName) =>
            operatorGroups[groupName].includes(token.value),
          ) || ""
        }
        keyFn={(token) => token.value}
        onClick={(token) =>
          updateToken(bindingId, tokenIndex, { value: token.value })
        }
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as React.Ref<HTMLButtonElement>, ref)}
            {...mergeProps({
              className:
                "cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-blue-50 border border-slate-300 text-blue-800 min-w-8 flex items-center justify-center",
            })}
          >
            <OperatorIcon name={token.value} compact={false} />
          </button>
        )}
        renderItem={(token) => (
          <>
            <OperatorIcon name={token.value} />
            <span>{operatorNames[token.value]}</span>
          </>
        )}
      />
    );
  },
);

export default OperatorToken;
