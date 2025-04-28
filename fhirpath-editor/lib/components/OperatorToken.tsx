import { forwardRef, Ref } from "react";

import { useProgramContext } from "../utils/store";
import { operatorGroups, operatorNames } from "../utils/operator";
import OperatorIcon from "./OperatorIcon";
import Dropdown from "./Dropdown";
import { mergeRefs } from "../utils/react";
import { IOperatorToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";

const OperatorToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const style = useStyle();
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
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
            {...mergeProps({ className: style.token.operator.button })}
          >
            <OperatorIcon name={token.value} compact={false} />
          </button>
        )}
        renderItem={(token) => (
          <>
            <OperatorIcon name={token.value} className={style.dropdown.icon} />
            <span className={style.dropdown.primary}>
              {operatorNames[token.value]}
            </span>
          </>
        )}
      />
    );
  },
);

export default OperatorToken;
