import { forwardRef } from "react";
import NumberToken from "./NumberToken";
import StringToken from "./StringToken";
import OperatorToken from "./OperatorToken";
import VariableToken from "./VariableToken";
import FieldToken from "./FieldToken";
import BooleanToken from "./BooleanToken";
import DateToken from "./DateToken";
import DateTimeToken from "./DateTimeToken";
import TimeToken from "./TimeToken";
import QuantityToken from "./QuantityToken";
import TypeToken from "./TypeToken";
import IndexToken from "./IndexToken";
import FunctionToken from "./FunctionToken";
import AnswerToken from "./AnswerToken";
import { TokenComponentProps, TokenType } from "../types/internal";
import { useStyle } from "../style";
import clx from "classnames";
import { X } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store.ts";

const getTokenComponent = (
  type: TokenType,
): ReturnType<typeof forwardRef<HTMLElement, TokenComponentProps>> => {
  switch (type) {
    case TokenType.number:
      return NumberToken;
    case TokenType.string:
      return StringToken;
    case TokenType.boolean:
      return BooleanToken;
    case TokenType.date:
      return DateToken;
    case TokenType.datetime:
      return DateTimeToken;
    case TokenType.time:
      return TimeToken;
    case TokenType.quantity:
      return QuantityToken;
    case TokenType.type:
      return TypeToken;
    case TokenType.index:
      return IndexToken;
    case TokenType.operator:
      return OperatorToken;
    case TokenType.variable:
      return VariableToken;
    case TokenType.field:
      return FieldToken;
    case TokenType.function:
      return FunctionToken;
    case TokenType.answer:
      return AnswerToken;
    default:
      throw new Error(`Unknown token type: ${type}`);
  }
};

type TokenProps = {
  type: TokenType;
  bindingId: string;
  tokenIndex: number;
  deleting?: boolean;
};

const Token = forwardRef<HTMLElement, TokenProps>(
  ({ type, deleting, ...props }, ref) => {
    const style = useStyle();
    const TokenComponent = getTokenComponent(type);
    const deleteToken = useProgramContext((state) => state.deleteToken);
    const last = useProgramContext(
      (state) =>
        state.getBindingExpression(props.bindingId).length - 1 ===
        props.tokenIndex,
    );

    return (
      <div
        data-token-index={props.tokenIndex}
        className={clx(style.token.container, deleting && style.token.deleting)}
      >
        <TokenComponent ref={ref} {...props} />

        {last && (
          <button
            className={style.token.delete}
            onClick={() => {
              deleteToken(props.bindingId, props.tokenIndex);
            }}
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>
    );
  },
);

export default Token;
