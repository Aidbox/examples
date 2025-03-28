import React from "react";
import NumberToken from "./NumberToken";
import StringToken from "./StringToken";
import OperatorToken from "./OperatorToken";
import VariableToken from "./VariableToken";
import FieldToken from "./FieldToken";

const Token = React.forwardRef(
  (
    {
      value,
      onChange,
      bindings,
      expression,
      index,
      deleting,
    },
    ref
  ) => {
    const currentExpression = expression.slice(0, index + 1);
    const prevTokens = expression.slice(0, index);

    return (
      <div
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
        ) : value.type === "operator" ? (
          <OperatorToken
            token={value}
            onChange={onChange}
            currentExpression={currentExpression}
            bindings={bindings}
            ref={ref}
          />
        ) : value.type === "variable" ? (
          <VariableToken
            token={value}
            onChange={onChange}
            bindings={bindings}
            currentExpression={currentExpression}
            ref={ref}
          />
        ) : value.type === "field" ? (
          <FieldToken
            token={value}
            onChange={onChange}
            bindings={bindings}
            prevTokens={prevTokens}
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
