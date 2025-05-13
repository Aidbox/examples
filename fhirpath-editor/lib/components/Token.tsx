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
import { TokenComponentProps, TokenKind } from "../types/internal";
import { useStyle } from "../style";
import clx from "classnames";
import { X } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store.ts";
import NullToken from "./NullToken.tsx";

const getTokenComponent = (
  kind: TokenKind,
): ReturnType<typeof forwardRef<HTMLElement, TokenComponentProps>> => {
  switch (kind) {
    case TokenKind.null:
      return NullToken;
    case TokenKind.number:
      return NumberToken;
    case TokenKind.string:
      return StringToken;
    case TokenKind.boolean:
      return BooleanToken;
    case TokenKind.date:
      return DateToken;
    case TokenKind.datetime:
      return DateTimeToken;
    case TokenKind.time:
      return TimeToken;
    case TokenKind.quantity:
      return QuantityToken;
    case TokenKind.type:
      return TypeToken;
    case TokenKind.index:
      return IndexToken;
    case TokenKind.operator:
      return OperatorToken;
    case TokenKind.variable:
      return VariableToken;
    case TokenKind.field:
      return FieldToken;
    case TokenKind.function:
      return FunctionToken;
    case TokenKind.answer:
      return AnswerToken;
    default:
      throw new Error(`Unknown token type: ${kind}`);
  }
};

type TokenProps = {
  kind: TokenKind;
  bindingId: string;
  tokenIndex: number;
  deleting?: boolean;
};

const Token = forwardRef<HTMLElement, TokenProps>(
  ({ kind, deleting, ...props }, ref) => {
    const style = useStyle();
    const TokenComponent = getTokenComponent(kind);
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
