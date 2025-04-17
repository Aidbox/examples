import React, { Fragment } from "react";

import { useProgramContext } from "@utils/store.js";
import { operatorGroups, operatorNames } from "@utils/operator.js";
import OperatorIcon from "@components/OperatorIcon.jsx";
import Dropdown from "@components/Dropdown.jsx";
import { mergeRefs } from "@utils/react.js";

const OperatorToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, suggestTokensAt } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
      }),
    );

    const tokens = suggestTokensAt(bindingId, tokenIndex);

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
          )
        }
        keyFn={(token) => token.value}
        onClick={(token) =>
          updateToken(bindingId, tokenIndex, { value: token.value })
        }
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
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
