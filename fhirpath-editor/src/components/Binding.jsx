import React, { forwardRef, useImperativeHandle } from "react";
import Token from "./Token";
import Cursor from "./Cursor";
import { useCommitableState, useDebug, useDoubleInvoke } from "@utils/react";
import { stringifyType } from "@utils/stringify.js";
import { Equals } from "@phosphor-icons/react";
import { useProgramContext } from "@utils/store.js";
import { delay } from "@utils/misc.js";
import EvalViewer from "./EvalViewer";

const Binding = forwardRef(({ bindingId, shadow }, forwardingRef) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const cursorRef = React.useRef(null);
  const nameRef = React.useRef(null);
  const debug = useDebug();

  const { name, trimBinding, renameBinding, setTokenRef, focusToken } =
    useProgramContext((state) => {
      return {
        name: state.getBindingName(bindingId),
        trimBinding: state.trimBinding,
        renameBinding: state.renameBinding,
        setTokenRef: state.setTokenRef,
        focusToken: state.focusToken,
      };
    });

  const tokenTypes = useProgramContext((state) =>
    state.getBindingExpression(bindingId).map((t) => t.type),
  );

  const type = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId),
  );

  useImperativeHandle(forwardingRef, () => {
    return {
      focus: () => {
        cursorRef.current?.focus();
      },
      get width() {
        const parent = nameRef.current?.parentElement;
        return parent ? getComputedStyle(parent).width : undefined;
      },
    };
  }, []);

  const [trimming, invokeTrim] = useDoubleInvoke(
    () => trimBinding(bindingId),
    1000,
  );

  const [nameAnimation, setNameAnimation] = React.useState("");
  const [expressionAnimation, setExpressionAnimation] = React.useState("");

  const [uncommitedName, setName, commitName] = useCommitableState(
    name,
    (name) => renameBinding(bindingId, name),
    () => {
      setNameAnimation("animate__animated animate__shakeX animate__faster");
      delay(() => {
        if (nameRef.current) {
          nameRef.current.focus();
          nameRef.current.setSelectionRange(0, nameRef.current.value.length);
        }
      });
    },
  );

  return (
    <>
      {name != null && (
        <label
          className={`flex border border-gray-300 rounded-md px-2 py-1.5 items-center focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 ${nameAnimation}
          ${
            trimming && tokenTypes.length === 0
              ? "bg-red-500 border-red-500 **:!text-white **:placeholder:!text-white **:!outline-none **:!border-none rounded"
              : ""
          }`}
          onAnimationEnd={() => setNameAnimation("")}
        >
          <input
            ref={nameRef}
            className="focus:outline-none field-sizing-content border border-transparent"
            type="text"
            placeholder="Name"
            value={uncommitedName}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
          />
        </label>
      )}
      {name != null && (
        <span className="text-gray-400">
          <Equals size={12} weight="bold" />
        </span>
      )}
      <div
        className="flex items-center gap-2 data-[shadow]:saturate-0"
        data-shadow={shadow || undefined}
      >
        <div
          className={`flex flex-row border border-gray-300 rounded-md px-2 py-1 items-center focus-within:outline focus-within:outline-blue-500 focus-within:border-blue-500 h-10 ${expressionAnimation} data-[empty]:border-dashed data-[empty]:focus-within:border-solid data-[empty]:hover:border-solid data-[empty]:min-w-10`}
          data-empty={tokenTypes.length === 0 || undefined}
          onMouseMove={(e) => {
            setIsHovered(
              e.target === e.currentTarget ||
                cursorRef.current?.contains(e.target),
            );
          }}
          onMouseLeave={(e) => {
            if (!e.target.contains(document.activeElement)) {
              setIsHovered(false);
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
                  e.target.closest("[data-token-index]")?.dataset?.tokenIndex,
                );
                if (index > 0) {
                  if (focusToken(bindingId, index - 1)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                } else if (cursorRef.current?.contains(e.target)) {
                  focusToken(bindingId, tokenTypes.length - 1);
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
                  e.target.closest("[data-token-index]")?.dataset?.tokenIndex,
                );

                if (index < tokenTypes.length - 1) {
                  if (focusToken(bindingId, index + 1)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                } else if (index === tokenTypes.length - 1) {
                  cursorRef.current?.focus();
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }
          }}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          onAnimationEnd={() => setExpressionAnimation("")}
        >
          <div className="flex flex-row empty:hidden gap-[2px]">
            {tokenTypes.map((type, tokenIndex) => (
              <Token
                key={tokenIndex}
                ref={(ref) => setTokenRef(bindingId, tokenIndex, ref)}
                type={type}
                bindingId={bindingId}
                tokenIndex={tokenIndex}
                deleting={trimming && tokenIndex === tokenTypes.length - 1}
              />
            ))}
          </div>
          <Cursor
            ref={cursorRef}
            bindingId={bindingId}
            hovering={isHovered}
            placeholder="Write expression..."
            onBackspace={invokeTrim}
            onMistake={() => {
              setExpressionAnimation(
                "animate__animated animate__shakeX animate__faster",
              );
            }}
          />
        </div>
        <div className="flex gap-2">
          {debug && !shadow && tokenTypes.length > 0 && (
            <span
              className="text-gray-500 inline-flex items-center gap-1 text-xs whitespace-nowrap"
              title={type.error}
            >
              {stringifyType(type)}
            </span>
          )}
          {!shadow && tokenTypes.length > 0 && (
            <EvalViewer bindingId={bindingId} />
          )}
        </div>
      </div>
    </>
  );
});

export default Binding;
