import { forwardRef, Fragment, useRef, useState } from "react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingOverlay,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import {
  category,
  functionMetadata,
  suggestArgumentTypesForFunction,
} from "../utils/function";
import {
  BracketsRound,
  CaretDown,
  Empty,
  Function,
} from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { isEmptyProgram } from "../utils/expression";
import {
  FunctionMetadata,
  IFunctionToken,
  TokenComponentProps,
} from "../types/internal";
import { assertDefined } from "../utils/misc";
import { Argument } from "./Argument";
import { useStyle } from "../style";
import { useText } from "../text";

const FunctionToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const style = useStyle();
    const text = useText();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [_selectingName, setSelectingName] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const listRef = useRef<Array<HTMLButtonElement | null>>([]);
    const arrowRef = useRef(null);

    const { token, isLeadingToken, updateToken, portalRoot } =
      useProgramContext((state) => ({
        token: state.getToken(bindingId, tokenIndex) as IFunctionToken,
        isLeadingToken: state.isLeadingToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        portalRoot: state.getPortalRoot(),
      }));

    const precedingExpressionType = useProgramContext((state) =>
      state.getExpressionType(bindingId, tokenIndex),
    );

    const meta = functionMetadata.find((f) => f.name === token.value);
    assertDefined(meta, `Function ${token.value} metadata not found`);

    const selectingName = _selectingName || !meta.args.length;

    const [selectedArgIndex, setSelectedArgIndex] = useState(
      meta.args.length &&
        (!meta.args[0].optional || !isEmptyProgram(token.args[0]))
        ? 0
        : null,
    );

    const suggestArgumentTypes = suggestArgumentTypesForFunction(
      meta.name,
      precedingExpressionType,
      [],
    );

    const { refs, floatingStyles, context } = useFloating({
      placement: "right",
      strategy: "absolute",
      transform: false,
      whileElementsMounted: autoUpdate,
      open: isOpen,
      onOpenChange: (open) => {
        setIsOpen(open);
        if (!open) {
          setSearch("");
          setSelectingName(false);
        }
      },
      middleware: [
        arrow({
          element: arrowRef,
        }),
        offset({
          mainAxis: 6,
        }),
        shift(),
        flip(),
        size({
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.max(0, availableHeight - 12)}px`,
            });
          },
        }),
      ],
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "listbox" });
    const listNav = useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      virtual: true,
      loop: true,
    });

    const { getReferenceProps, getFloatingProps, getItemProps } =
      useInteractions([click, dismiss, role, listNav]);

    const mergedRefs = useMergeRefs([ref, refs.setReference]);

    const filteredFunctions = functionMetadata.filter(
      (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
    );

    const groupedOptions = filteredFunctions.reduce(
      (acc, meta, index) => {
        const categoryName =
          Object.keys(category).find((categoryName) =>
            category[categoryName].includes(meta.name),
          ) || "Other";

        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        acc[categoryName].push({ meta, index });
        return acc;
      },
      {} as Record<string, { meta: FunctionMetadata; index: number }[]>,
    );

    function handleSelectName(meta: FunctionMetadata) {
      setSearch("");
      setSelectingName(false);
      if (meta.args.length) {
        setSelectedArgIndex(
          !meta.args[0].optional && !isEmptyProgram(token.args[0]) ? 0 : null,
        );
      } else {
        setIsOpen(false);
      }
      updateToken(bindingId, tokenIndex, {
        value: meta.name,
        args: [],
      });
    }

    return (
      <>
        <button
          ref={mergedRefs}
          {...getReferenceProps()}
          data-open={isOpen || undefined}
          className={style.token.button}
        >
          {isLeadingToken ? "" : "."}
          {token.value}
          <BracketsRound size={16} weight="bold" />
        </button>
        {isOpen && (
          <FloatingPortal id={portalRoot}>
            <FloatingOverlay className={style.dropdown.backdrop} lockScroll />
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={style.token.function.dropdown}
              {...getFloatingProps()}
            >
              <FloatingArrow ref={arrowRef} context={context} fill="red" />
              <div className={style.token.function.header}>
                {selectingName ? (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={style.token.function.search}
                    placeholder={text.token.function.search.placeholder}
                    autoFocus
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        activeIndex != null &&
                        filteredFunctions[activeIndex]
                      ) {
                        handleSelectName(filteredFunctions[activeIndex]);
                      }
                    }}
                  />
                ) : (
                  <>
                    <button
                      className={style.token.function.name}
                      onClick={() => setSelectingName(true)}
                    >
                      {meta.name} <CaretDown />
                    </button>

                    {meta.args.length > 0 && (
                      <span className={style.token.function.label}>
                        {text.token.function.label.arguments}
                      </span>
                    )}

                    <div className={style.token.function.args}>
                      {meta.args.map((arg, argIndex) => (
                        <button
                          key={argIndex}
                          className={style.token.function.arg}
                          data-selected={
                            argIndex === selectedArgIndex || undefined
                          }
                          data-optional={arg.optional || undefined}
                          onClick={() => setSelectedArgIndex(argIndex)}
                        >
                          {meta.args[argIndex].name}
                          {argIndex === selectedArgIndex && (
                            <svg
                              viewBox="0 0 12 12"
                              className={style.token.function.arrow}
                            >
                              <path d="M1 8H11" />
                              <path d="M1 8L6 2L11 8" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className={style.token.function.body}>
                {!selectingName &&
                  selectedArgIndex != null &&
                  meta.args[selectedArgIndex] !== undefined && (
                    <Argument
                      bindingId={bindingId}
                      tokenIndex={tokenIndex}
                      argIndex={selectedArgIndex}
                      suggestedType={suggestArgumentTypes[selectedArgIndex]}
                      contextValue={null} // todo: pass iteration element here
                    />
                  )}
                {selectingName &&
                  (filteredFunctions.length > 0 ? (
                    Object.entries(groupedOptions).map(([group, options]) => (
                      <Fragment key={group}>
                        <div className={style.dropdown.group}>{group}</div>
                        {options.map(({ meta, index }) => (
                          <button
                            key={meta.name}
                            ref={(node) => (listRef.current[index] = node)}
                            data-active={activeIndex === index || undefined}
                            {...getItemProps({
                              className: style.dropdown.option,
                              tabIndex: activeIndex === index ? 0 : -1,
                              onClick: () => handleSelectName(meta),
                            })}
                          >
                            <Function
                              size={16}
                              className={style.dropdown.icon}
                            />
                            <span className={style.dropdown.primary}>
                              {meta.name}
                            </span>
                          </button>
                        ))}
                      </Fragment>
                    ))
                  ) : (
                    <div className={style.dropdown.empty}>
                      <Empty size={16} /> {text.dropdown.empty.nothingFound}
                    </div>
                  ))}
              </div>
            </div>
          </FloatingPortal>
        )}
      </>
    );
  },
);

export default FunctionToken;
