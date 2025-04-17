import React from "react";
import NumberToken from "./NumberToken.jsx";
import StringToken from "./StringToken.jsx";
import OperatorToken from "./OperatorToken.jsx";
import VariableToken from "./VariableToken.jsx";
import FieldToken from "./FieldToken.jsx";
import BooleanToken from "./BooleanToken.jsx";
import DateToken from "./DateToken.jsx";
import DateTimeToken from "./DateTimeToken.jsx";
import TimeToken from "./TimeToken.jsx";
import QuantityToken from "./QuantityToken.jsx";
import TypeToken from "./TypeToken.jsx";
import IndexToken from "./IndexToken.jsx";
import FunctionToken from "./FunctionToken.jsx";
import AnswerToken from "@components/AnswerToken.jsx";

const getTokenComponent = (type) => {
  switch (type) {
    case "number":
      return NumberToken;
    case "string":
      return StringToken;
    case "boolean":
      return BooleanToken;
    case "date":
      return DateToken;
    case "datetime":
      return DateTimeToken;
    case "time":
      return TimeToken;
    case "quantity":
      return QuantityToken;
    case "type":
      return TypeToken;
    case "index":
      return IndexToken;
    case "operator":
      return OperatorToken;
    case "variable":
      return VariableToken;
    case "field":
      return FieldToken;
    case "function":
      return FunctionToken;
    case "answer":
      return AnswerToken;
    default:
      throw new Error(`Unknown token type: ${type}`);
  }
};

const Token = React.forwardRef(({ type, deleting, ...props }, ref) => {
  const TokenComponent = getTokenComponent(type);

  return (
    <div
      data-token-index={props.tokenIndex}
      className={`flex items-stretch ${
        deleting
          ? "bg-red-500 rounded group **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none **:!bg-transparent"
          : ""
      }`}
    >
      <TokenComponent ref={ref} {...props} />
    </div>
  );
});

export default Token;
