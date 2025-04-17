import React, { Fragment } from "react";

import { useProgramContext } from "@utils/store.js";
import {
  operatorGroups,
  operatorMetadata,
  operatorNames,
  suggestOperatorsForLeftType,
} from "@utils/operator.js";
import { distinct } from "@utils/misc.js";
import OperatorIcon from "@components/OperatorIcon.jsx";
import Dropdown from "@components/Dropdown.jsx";
import { mergeRefs } from "@utils/react.js";

const OperatorToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex),
      updateToken: state.updateToken,
    }));

    // const precedingExpressionType = useProgramContext((state) =>
    //   state.getBindingExpressionType(bindingId, tokenIndex),
    // );
    //
    // const compatibleOperators = distinct(
    //   suggestOperatorsForLeftType(precedingExpressionType).map(
    //     (meta) => meta.name,
    //   ),
    // );

    const compatibleOperators = distinct(
      operatorMetadata.map((meta) => meta.name),
    );

    return (
      <Dropdown
        items={compatibleOperators}
        searchFn={(operator, term) =>
          operatorNames[operator].toLowerCase().includes(term.toLowerCase()) ||
          operator.toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(operator) =>
          Object.keys(operatorGroups).find((groupName) =>
            operatorGroups[groupName].includes(operator),
          )
        }
        keyFn={(operator) => operator}
        onClick={(operator) =>
          updateToken(bindingId, tokenIndex, { value: operator })
        }
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className:
                "cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-blue-50 border border-slate-300 text-blue-800",
            })}
          >
            <OperatorIcon name={token.value} compact={false} />
          </button>
        )}
        renderItem={(operator) => (
          <>
            <OperatorIcon name={operator} />
            <span>{operatorNames[operator]}</span>
          </>
        )}
      />
    );
  },
);

export default OperatorToken;
