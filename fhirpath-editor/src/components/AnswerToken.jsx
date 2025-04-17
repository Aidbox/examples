import React, { Fragment } from "react";
import { useProgramContext } from "@utils/store.js";
import { Textbox } from "@phosphor-icons/react";
import Dropdown from "@components/Dropdown.jsx";
import { mergeRefs, useDebug } from "@utils/react.js";

const AnswerToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, suggestTokensAt, getQuestionnaireItems } =
      useProgramContext((state) => ({
        token: state.getToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        suggestTokensAt: state.suggestTokensAt,
        getQuestionnaireItems: state.getQuestionnaireItems,
      }));

    const questionnaireItems = getQuestionnaireItems();
    const tokens = suggestTokensAt(bindingId, tokenIndex);
    const debug = useDebug();

    return (
      <Dropdown
        items={tokens}
        searchFn={(token, term) =>
          questionnaireItems[token.value]?.text
            .toLowerCase()
            .includes(term.toLowerCase()) ||
          token.value.toLowerCase().includes(term.toLowerCase())
        }
        onClick={(token) => {
          updateToken(bindingId, tokenIndex, { value: token.value });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 flex items-center gap-1`,
            })}
          >
            <Textbox className="opacity-50" />
            <span className="max-w-42 truncate">
              {questionnaireItems[token.value]?.text || token.value}
            </span>
          </button>
        )}
        renderItem={(token) => (
          <>
            <Textbox size={16} className="text-gray-500 shrink-0" />
            <span className="truncate">
              {questionnaireItems[token.value]?.text || token.value}{" "}
            </span>
            {debug ? (
              <span className="text-sm text-gray-500 truncate flex-1 text-right">
                {token.debug}
              </span>
            ) : (
              questionnaireItems[token.value] && (
                <div className="text-sm text-gray-500 truncate flex-1 text-right">
                  {token.value}
                </div>
              )
            )}
          </>
        )}
      />
    );
  },
);

export default AnswerToken;
