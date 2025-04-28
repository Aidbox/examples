import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { Textbox } from "@phosphor-icons/react";
import Dropdown from "./Dropdown";
import { mergeRefs } from "../utils/react";
import { IAnswerToken } from "../types/internal";
import { useStyle } from "../style";

type AnswerTokenProps = {
  bindingId: string;
  tokenIndex: number;
};

const AnswerToken = forwardRef<HTMLElement, AnswerTokenProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const style = useStyle();
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
            {...mergeProps({ className: style.token.answer.button })}
          >
            <Textbox className={style.dropdown.icon} />
            <span>{questionnaireItems[token.value]?.text || token.value}</span>
          </button>
        )}
        renderItem={(token) => (
          <>
            <Textbox size={16} className={style.token.answer.icon} />
            <span className={style.dropdown.primary}>
              {questionnaireItems[token.value]?.text || token.value}{" "}
            </span>
            {debug ? (
              <span className={style.dropdown.secondary}>{token.debug}</span>
            ) : (
              questionnaireItems[token.value] && (
                <div className={style.dropdown.secondary}>{token.value}</div>
              )
            )}
          </>
        )}
      />
    );
  },
);

export default AnswerToken;
