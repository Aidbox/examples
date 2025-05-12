import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Token from "./Token";
import Cursor, { CursorRef } from "./Cursor";
import { useCommitableState, useDoubleInvoke } from "../utils/react";
import { Equals } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { delay } from "../utils/misc";
import ValueViewer from "./ValueViewer.tsx";
import { BindingRef, TypeName } from "../types/internal";
import { stringifyType } from "../utils/type";
import { useStyle } from "../style";
import { useText } from "../text";
import clx from "classnames";

type BindingProps = {
  bindingId: string;
  placeholder?: string;
};

const Binding = forwardRef<BindingRef, BindingProps>(
  ({ bindingId, placeholder }, forwardingRef) => {
    const style = useStyle();
    const text = useText();
    const cursorRef = useRef<CursorRef | null>(null);
    const nameRef = useRef<HTMLInputElement | null>(null);

    const {
      name,
      empty,
      trimBinding,
      renameBinding,
      setTokenRef,
      focusToken,
      getBindingType,
      getDependantBindingIds,
      getDependingBindings,
      getBindableBindings,
      debug,
    } = useProgramContext((state) => {
      return {
        name: bindingId && state.getBindingName(bindingId),
        empty: !state.getBindingExpression(bindingId).length,
        trimBinding: state.trimBinding,
        renameBinding: state.renameBinding,
        setTokenRef: state.setTokenRef,
        focusToken: state.focusToken,
        getBindingType: state.getBindingType,
        getDependantBindingIds: state.getDependantBindingIds,
        getDependingBindings: state.getDependingBindings,
        getBindableBindings: state.getBindableBindings,
        debug: state.getDebug(),
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

    const [nameAnimation, setNameAnimation] = useState("");
    const [expressionAnimation, setExpressionAnimation] = useState("");

    const [uncommitedName, setName, commitName] = useCommitableState(
      name || "",
      (name) => bindingId && name && renameBinding(bindingId, name),
      () => {
        setNameAnimation(style.binding.animate);
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
        {name && (
          <input
            ref={nameRef}
            className={clx(
              style.binding.name,
              nameAnimation,
              trimming && tokenTypes.length === 0 && style.binding.deleting,
            )}
            onAnimationEnd={() => setNameAnimation("")}
            type="text"
            placeholder={text.binding.name.placeholder}
            value={uncommitedName}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
          />
        )}
        {name && (
          <Equals size={12} weight="bold" className={style.binding.equals} />
        )}
        <div
          className={clx(
            style.binding.expression,
            expressionAnimation,
            !name && style.binding.nameless,
          )}
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
            onBackspace={invokeTrim}
            onMistake={() => {
              setExpressionAnimation(style.binding.animate);
            }}
            placeholder={!bindingId && empty ? placeholder : undefined}
          />
        </div>

        {tokenTypes.length > 0 && <ValueViewer bindingId={bindingId} />}

        {debug && tokenTypes.length > 0 && (
          <div className={style.binding.vbox}>
            <div className={style.binding.debug}>
              dependants: {getDependantBindingIds(bindingId).join(", ")}
            </div>
            <div className={style.binding.debug}>
              dependencies:{" "}
              {getDependingBindings(bindingId)
                .map((b) => b.name)
                .join(", ")}
            </div>
            <div className={style.binding.debug}>
              bindables:{" "}
              {getBindableBindings(bindingId)
                .map((b) => b.name)
                .join(", ")}
            </div>
            <span
              className={style.binding.debug}
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
