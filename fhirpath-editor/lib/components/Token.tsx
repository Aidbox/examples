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
import css from "./Token.module.css";
import clx from "classnames";

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
    const TokenComponent = getTokenComponent(type);

    return (
      <div
        data-token-index={props.tokenIndex}
        className={clx(css.container, deleting && css.deleting)}
      >
        <TokenComponent ref={ref} {...props} />
      </div>
    );
  },
);

export default Token;
