import React, { forwardRef, useImperativeHandle } from "react";
import Token from "./Token";
import Cursor, { ICursorRef } from "./Cursor";
import { useCommitableState, useDebug, useDoubleInvoke } from "@/utils/react";
import { stringifyType } from "@/utils/stringify";
import { Equals } from "@phosphor-icons/react";
import { useProgramContext } from "@/utils/store";
import { delay } from "@/utils/misc";
import EvalViewer from "./EvalViewer";
import { IBindingRef, TypeName } from "@/types/internal";

interface IBindingProps {
  bindingId: string | null;
}

const Binding = forwardRef<IBindingRef, IBindingProps>(
  ({ bindingId }, forwardingRef) => {
    const cursorRef = React.useRef<ICursorRef | null>(null);
    const nameRef = React.useRef<HTMLInputElement | null>(null);
    const debug = useDebug();

    const {
      name,
      trimBinding,
      renameBinding,
      setTokenRef,
      focusToken,
      getBindingType,
      getDependantBindingIds,
      getDependingBindings,
      getBindableBindings,
    } = useProgramContext((state) => {
      return {
        name: bindingId && state.getBindingName(bindingId),
        trimBinding: state.trimBinding,
        renameBinding: state.renameBinding,
        setTokenRef: state.setTokenRef,
        focusToken: state.focusToken,
        getBindingType: state.getBindingType,
        getDependantBindingIds: state.getDependantBindingIds,
        getDependingBindings: state.getDependingBindings,
        getBindableBindings: state.getBindableBindings,
      };
    });

    const tokenTypes = useProgramContext((state) =>
      state.getBindingExpression(bindingId).map((t) => t.type),
    );

    const type = getBindingType(bindingId);

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
      name || "",
      (name) => bindingId && name && renameBinding(bindingId, name),
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
          <input
            ref={nameRef}
            className={`justify-self-start focus:outline-none field-sizing-content rounded px-1.5 py-0.5 bg-green-50 border border-slate-300 text-green-800 placeholder:text-green-100 ${nameAnimation}
          ${
            trimming && tokenTypes.length === 0
              ? "!bg-red-500 !border-red-500 !text-white"
              : ""
          }`}
            onAnimationEnd={() => setNameAnimation("")}
            type="text"
            placeholder="Name"
            value={uncommitedName}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
          />
        )}
        {name != null && (
          <Equals size={12} weight="bold" className="text-gray-400" />
        )}
        <div
          className={`flex items-center ${expressionAnimation} ${name == null ? "col-span-3" : ""}`}
          onKeyDown={(e) => {
            const targetAsInput = e.target as HTMLInputElement;
            const targetAsElement = e.target as HTMLElement;

            if (e.key === "ArrowLeft") {
              if (!targetAsInput.selectionStart) {
                const index = parseInt(
                  targetAsElement?.closest<HTMLElement>("[data-token-index]")
                    ?.dataset?.tokenIndex || "",
                );
                if (index > 0) {
                  if (focusToken(bindingId, index - 1)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                } else if (cursorRef.current?.contains(targetAsElement)) {
                  focusToken(bindingId, tokenTypes.length - 1);
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }
            if (e.key === "ArrowRight") {
              if (
                targetAsInput.selectionEnd === undefined ||
                targetAsInput.selectionEnd === targetAsInput.value.length
              ) {
                const index = parseInt(
                  targetAsElement.closest<HTMLElement>("[data-token-index]")
                    ?.dataset?.tokenIndex || "",
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
          onAnimationEnd={() => setExpressionAnimation("")}
        >
          <div className="flex gap-1 w-full">
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
            <Cursor
              ref={cursorRef}
              bindingId={bindingId}
              placeholder="Write expression..."
              onBackspace={invokeTrim}
              onMistake={() => {
                setExpressionAnimation(
                  "animate__animated animate__shakeX animate__faster",
                );
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tokenTypes.length > 0 && <EvalViewer bindingId={bindingId} />}
        </div>

        {debug && tokenTypes.length > 0 && (
          <div className="flex flex-col items-start gap-2">
            <div className="text-purple-600 truncate text-sm">
              dependants: {getDependantBindingIds(bindingId).join(", ")}
            </div>
            <div className="text-purple-600 truncate text-sm">
              dependencies:{" "}
              {getDependingBindings(bindingId)
                .map((b) => b.name)
                .join(", ")}
            </div>
            <div className="text-purple-600 truncate text-sm">
              bindables:{" "}
              {getBindableBindings(bindingId)
                .map((b) => b.name)
                .join(", ")}
            </div>
            <span
              className="text-purple-600 truncate text-sm"
              title={type.type === TypeName.Invalid ? type.error : ""}
            >
              {stringifyType(type)}
            </span>
          </div>
        )}
      </>
    );
  },
);

export default Binding;
