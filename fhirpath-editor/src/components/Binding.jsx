import React, { forwardRef } from "react";
import Token from "./Token";
import Cursor from "./Cursor";
import {
  suggestNextToken,
  getExpressionType,
  findCompatibleVariables,
  findCompatibleOperators,
} from "../utils/types";
import mergeRefs, { useCommitableState } from "../utils/react";

const Binding = forwardRef(({ value, onChange, bindings }, forwardingRef) => {
  const [hovering, setHovering] = React.useState(false);
  const tokenRefs = React.useRef([]);
  const [deleting, setDeleting] = React.useState(false);
  const resetDeletingTimer = React.useRef(null);
  const cursorRef = React.useRef(null);

  React.useEffect(() => {
    if (deleting) {
      resetDeletingTimer.current = setTimeout(() => {
        setDeleting(false);
      }, 500);
    }
  }, [deleting]);

  // Calculate the result type to display
  const resultType = getExpressionType(value.expression, bindings);

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

  const addToken = (token, focus = true) => {
    if (token.type === "variable" && token.value === undefined) {
      const compatibleBindings = findCompatibleVariables(
        bindings,
        value.expression
      );
      token.value = compatibleBindings[0]?.name || "";
    } else if (token.type === "string" && token.value === undefined) {
      token.value = "";
    } else if (token.type === "number" && token.value === undefined) {
      token.value = "";
    } else if (token.type === "boolean" && token.value === undefined) {
      token.value = "true";
    } else if (token.type === "date" && token.value === undefined) {
      // Initialize with current date in YYYY-MM-DD format
      const today = new Date();
      token.value = today.toISOString().split("T")[0];
    } else if (token.type === "datetime" && token.value === undefined) {
      // Initialize with current datetime in YYYY-MM-DDThh:mm format (browser compatible)
      const now = new Date();
      token.value = now.toISOString().slice(0, 16);
    } else if (token.type === "time" && token.value === undefined) {
      // Initialize with current time in hh:mm format
      const now = new Date();
      token.value = now.toTimeString().slice(0, 5);
    } else if (token.type === "quantity" && token.value === undefined) {
      // Initialize with an empty value and unit as an object
      token.value = { value: "", unit: "seconds" };
    } else if (token.type === "operator" && token.value === undefined) {
      const compatibleOperators = findCompatibleOperators(
        bindings,
        value.expression
      );
      token.value = compatibleOperators[0] || "+";
    }

    onChange({
      ...value,
      expression: [...value.expression, token],
    });

    if (focus) {
      // Focus the new token after render
      setTimeout(() => {
        tokenRefs.current[value.expression.length]?.focus();
      }, 0);
    }
  };

  const [nameAnimation, setNameAnimation] = React.useState("");
  const [expressionAnimation, setExpressionAnimation] = React.useState("");

  const [name, setName, commitName] = useCommitableState(
    value.name,
    (name) => onChange({ ...value, name }),
    () => setNameAnimation("animate__animated animate__shakeX animate__faster")
  );

  return (
    <>
      {value.name !== null && (
        <label
          className={`flex border border-gray-300 rounded-md px-2 py-1 items-center focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 h-11 ${nameAnimation}
          ${
            deleting && value.expression.length === 0
              ? "bg-red-500 border-red-500 **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none rounded"
              : ""
          }`}
          onAnimationEnd={() => setNameAnimation("")}
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
      <div
        className={`flex flex-row gap-1 border border-gray-300 rounded-md px-2 py-1 items-center focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 h-11 ${expressionAnimation} data-[empty]:border-dashed data-[empty]:focus-within:border-solid data-[empty]:hover:border-solid data-[empty]:min-w-10`}
        data-empty={value.expression.length === 0 || undefined}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={(e) => {
          if (!e.target.contains(document.activeElement)) {
            setHovering(false);
          }
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            cursorRef.current?.focus();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            if (!e.target.selectionStart) {
              const index = parseInt(
                e.target.closest("[data-index]")?.dataset?.index
              );
              if (index > 0) {
                const element = tokenRefs.current[index - 1];
                if (element) {
                  element.focus();
                  e.preventDefault();
                  e.stopPropagation();
                }
              } else if (e.target === cursorRef.current) {
                tokenRefs.current[value.expression.length - 1]?.focus();
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }
          if (e.key === "ArrowRight") {
            if (
              e.target.selectionEnd === undefined ||
              e.target.selectionEnd === e.target.value.length
            ) {
              const index = parseInt(
                e.target.closest("[data-index]")?.dataset?.index
              );

              if (index < value.expression.length - 1) {
                const element = tokenRefs.current[index + 1];
                if (element) {
                  element.focus();
                  e.preventDefault();
                  e.stopPropagation();
                }
              } else if (index === value.expression.length - 1) {
                cursorRef.current?.focus();
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }
        }}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        onAnimationEnd={() => setExpressionAnimation("")}
      >
        <div className="flex flex-row empty:hidden gap-[2px]">
          {value.expression.map((token, index) => (
            <Token
              key={index}
              value={token}
              index={index}
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
              expression={value.expression.slice(0, index + 1)}
              deleting={deleting && index === value.expression.length - 1}
              ref={(ref) => (tokenRefs.current[index] = ref)}
            />
          ))}
        </div>
        <Cursor
          id={`${value.name}-expression`}
          ref={mergeRefs(forwardingRef, cursorRef)}
          nextTokens={suggestNextToken(value.expression, bindings)}
          onAddToken={addToken}
          onDeleteToken={deleteToken}
          hovering={hovering}
          empty={value.expression.length === 0}
          bindings={bindings}
          onMistake={() => {
            setExpressionAnimation(
              "animate__animated animate__shakeX animate__faster"
            );
          }}
        />
      </div>
    </>
  );
});

export default Binding;
