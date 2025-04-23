import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { Textbox } from "@phosphor-icons/react";
import Dropdown from "./Dropdown";
import { mergeRefs } from "../utils/react";
import { IAnswerToken } from "../types/internal";

type AnswerTokenProps = {
  bindingId: string;
  tokenIndex: number;
};

const AnswerToken = forwardRef<HTMLElement, AnswerTokenProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const {
      token,
      updateToken,
      suggestTokensAt,
      getQuestionnaireItems,
      debug,
    } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IAnswerToken,
      updateToken: state.updateToken,
      suggestTokensAt: state.suggestTokensAt,
      getQuestionnaireItems: state.getQuestionnaireItems,
      debug: state.getDebug(),
    }));

    const questionnaireItems = getQuestionnaireItems();
    const tokens = suggestTokensAt<IAnswerToken>(bindingId, tokenIndex);

    return (
      <Dropdown
        items={tokens}
        searchFn={(token, term) => {
          return (
            questionnaireItems[token.value]?.text
              ?.toLowerCase()
              ?.includes(term.toLowerCase()) ||
            token.value.toLowerCase().includes(term.toLowerCase())
          );
        }}
        onClick={(token) => {
          updateToken(bindingId, tokenIndex, { value: token.value });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
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
