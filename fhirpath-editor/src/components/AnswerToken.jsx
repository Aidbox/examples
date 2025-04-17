import React, { Fragment } from "react";
import { useProgramContext } from "@utils/store.js";
import { stringifyType } from "@utils/stringify.js";
import { Textbox } from "@phosphor-icons/react";
import Dropdown from "@components/Dropdown.jsx";
import { mergeRefs, useDebug } from "@utils/react.js";

const AnswerToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const debug = useDebug();

    const { token, updateToken, getQuestionnaireItems } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        getFhirSchema: state.getFhirSchema,
        getQuestionnaireItems: state.getQuestionnaireItems,
      }),
    );

    const items = getQuestionnaireItems();

    return (
      <Dropdown
        items={Object.keys(items)}
        searchFn={(linkId, term) =>
          items[linkId]?.text.toLowerCase().includes(term.toLowerCase()) ||
          linkId.toLowerCase().includes(term.toLowerCase())
        }
        onClick={(linkId) => {
          updateToken(bindingId, tokenIndex, { value: linkId });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 flex items-center gap-1`,
            })}
          >
            <Textbox className="opacity-50" />{" "}
            <span className="max-w-42 truncate">
              {items[token.value]?.text || token.value}
            </span>
          </button>
        )}
        renderItem={(linkId) => (
          <>
            <Textbox size={16} className="text-gray-500 shrink-0" />
            <span className="truncate">{items[linkId]?.text || linkId} </span>
            {debug ? (
              <span className="text-sm text-gray-500 truncate flex-1 text-right">
                {stringifyType(items[linkId].type)}
              </span>
            ) : (
              items[linkId] && (
                <div className="text-sm text-gray-500 truncate flex-1 text-right">
                  {linkId}
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
