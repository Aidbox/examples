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

const Token = React.forwardRef(
  ({ value, onChange, bindings, expression, deleting, index }, ref) => {
    return (
      <div
        data-index={index}
        className={`${
          deleting
            ? "bg-red-500 **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none rounded"
            : ""
        }`}
      >
        {value.type === "number" ? (
          <NumberToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "string" ? (
          <StringToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "boolean" ? (
          <BooleanToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "date" ? (
          <DateToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "datetime" ? (
          <DateTimeToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "time" ? (
          <TimeToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "quantity" ? (
          <QuantityToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "type" ? (
          <TypeToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "index" ? (
          <IndexToken token={value} onChange={onChange} ref={ref} />
        ) : value.type === "operator" ? (
          <OperatorToken
            token={value}
            onChange={onChange}
            expression={expression}
            bindings={bindings}
            ref={ref}
          />
        ) : value.type === "variable" ? (
          <VariableToken
            token={value}
            onChange={onChange}
            bindings={bindings}
            expression={expression}
            ref={ref}
          />
        ) : value.type === "field" ? (
          <FieldToken
            token={value}
            onChange={onChange}
            bindings={bindings}
            expression={expression}
            ref={ref}
          />
        ) : value.type === "function" ? (
          <FunctionToken
            token={value}
            onChange={onChange}
            bindings={bindings}
            expression={expression}
            ref={ref}
          />
        ) : (
          <div className="text-red-500">⚠️ unknown token type</div>
        )}
      </div>
    );
  }
);

export default Token;
