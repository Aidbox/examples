import React from "react";
import Token from "./tokens/Token";
import Cursor from "./Cursor";
import {
  suggestNextTokens,
  calculateResultType,
  filterCompatibleVariables,
} from "../utils/typeSystem";
import { useCommitableState } from "../utils/hooks";

const Binding = ({ value, onChange, bindings }) => {
  const suggestions = suggestNextTokens(value.expression, bindings);
  const [hovering, setHovering] = React.useState(value);
  const lastTokenRef = React.useRef(null);
  const [deleting, setDeleting] = React.useState(false);
  const resetDeletingTimer = React.useRef(null);
  const bindingRef = React.useRef(null);

  React.useEffect(() => {
    if (deleting) {
      resetDeletingTimer.current = setTimeout(() => {
        setDeleting(false);
      }, 500);
    }
  }, [deleting]);

  // Calculate the result type to display
  const resultType = calculateResultType(value.expression, bindings);

  const deleteToken = () => {
    if (deleting) {
      setDeleting(false);
      clearTimeout(resetDeletingTimer.current);

      if (value.expression.length > 0) {
        onChange({
          ...value,
          expression: value.expression.slice(0, -1),
        });
      } else {
        if (value.name !== null) {
          onChange(null);
        }
      }
    } else {
      setDeleting(true);
    }
  };

  const addToken = (type) => {
    let newToken;
    if (typeof type === "object" && type.type === "field") {
      // Handle pre-filled field suggestions
      newToken = {
        type: "field",
        field: type.field,
      };
    } else if (type === "variable") {
      const compatibleBindings = filterCompatibleVariables(
        bindings,
        value.expression
      );
      console.log({ compatibleBindings, expression: value.expression });
      newToken = {
        type: "variable",
        value: compatibleBindings[0]?.name || "",
      };
    } else if (type === "string") {
      newToken = { type: "string", value: "" };
    } else if (type === "number") {
      newToken = { type: "number", value: "" };
    } else {
      newToken = { type: "operator", value: "+" };
    }

    if (newToken) {
      onChange({
        ...value,
        expression: [...value.expression, newToken],
      });

      // Focus the new token after render
      setTimeout(() => {
        lastTokenRef.current?.focus();
      }, 0);
    }
  };

  const [animation, setAnimation] = React.useState("");

  const [name, setName, commitName] = useCommitableState(
    value.name,
    (name) => onChange({ ...value, name }),
    () => setAnimation("animate__animated animate__shakeX animate__fast")
  );

  return (
    <div className={`flex flex-row gap-2 items-center`} ref={bindingRef}>
      {value.name !== null && (
        <label
          className={`border border-gray-300 rounded-md p-2 focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 h-11 ${animation}
          ${
            deleting && value.expression.length === 0
              ? "bg-red-500 border-red-500 **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none rounded"
              : ""
          }`}
          onAnimationEnd={() => setAnimation("")}
        >
          <input
            className="focus:outline-none field-sizing-content"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
          />
          <span className="text-sm text-gray-500">
            : {resultType || "unknown"}
          </span>
        </label>
      )}
      {value.name !== null && "="}
      <label
        htmlFor={`${value.name}-expression`}
        className="flex flex-row gap-1 border border-gray-300 rounded-md p-2 items-center focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 h-11"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={(e) => {
          if (!e.target.contains(document.activeElement)) {
            setHovering(false);
          }
        }}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
      >
        <div className="flex flex-row empty:hidden gap-[2px]">
          {value.expression.map((token, index) => (
            <Token
              key={index}
              value={token}
              onChange={(newToken) =>
                onChange({
                  ...value,
                  expression: [
                    ...value.expression.slice(0, index),
                    newToken,
                    ...value.expression.slice(index + 1),
                  ],
                })
              }
              bindings={bindings}
              expression={value.expression}
              index={index}
              deleting={deleting && index === value.expression.length - 1}
              ref={index === value.expression.length - 1 ? lastTokenRef : null}
            />
          ))}
        </div>
        <Cursor
          id={`${value.name}-expression`}
          suggestions={suggestions}
          onAddToken={addToken}
          onDeleteToken={deleteToken}
          hovering={hovering || value.expression.length === 0}
        />
      </label>
    </div>
  );
};

export default Binding;
