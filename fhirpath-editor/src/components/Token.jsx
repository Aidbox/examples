import React from "react";
import NumberToken from "./tokens/NumberToken";
import StringToken from "./tokens/StringToken";
import OperatorToken from "./tokens/OperatorToken";
import VariableToken from "./tokens/VariableToken";
import FieldToken from "./tokens/FieldToken";
import BooleanToken from "./tokens/BooleanToken";
import DateToken from "./tokens/DateToken";
import DateTimeToken from "./tokens/DateTimeToken";
import TimeToken from "./tokens/TimeToken";
import QuantityToken from "./tokens/QuantityToken";
import TypeToken from "./tokens/TypeToken";
import IndexToken from "./tokens/IndexToken";
import FunctionToken from "./tokens/FunctionToken";

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
    default:
      throw new Error(`Unknown token type: ${type}`);
  }
};

const Token = React.forwardRef(({ type, deleting, ...props }, ref) => {
  const TokenComponent = getTokenComponent(type);

  return (
    <div
      data-token-index={props.tokenIndex}
      className={
        deleting
          ? "bg-red-500 **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none rounded"
          : ""
      }
    >
      <TokenComponent ref={ref} {...props} />
    </div>
  );
});

export default Token;
