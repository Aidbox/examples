import { CSSProperties, forwardRef, Fragment, useRef, useState } from "react";
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
import { category, functionMetadata } from "../utils/function";
import { CaretDown, Empty, Function } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { isEmptyProgram } from "../utils/expression";
import {
  FunctionMetadata,
  IFunctionToken,
  TokenComponentProps,
  TypeName,
} from "../types/internal";
import { assertDefined, colors, scrollIntoView, truncate } from "../utils/misc";
import { Argument } from "./Argument";
import { useStyle } from "../style";
import { useText } from "../text";
import { unparseExpression } from "../utils/fhirpath.ts";

const FunctionToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const style = useStyle();
    const text = useText();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [_selectingName, setSelectingName] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
      new Set(),
    );
    const listRef = useRef<Array<HTMLButtonElement | null>>([]);
    const arrowRef = useRef(null);
    const headerRef = useRef<HTMLDivElement | null>(null);

    const {
      token,
      contextValue,
      getArgContextType,
      getExpressionValue,
      isLeadingToken,
      updateToken,
      portalRoot,
    } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IFunctionToken,
      contextValue: state.getContext().value,
      getArgContextType: state.getArgContextType,
      getExpressionValue: state.getExpressionValue,
      isLeadingToken: state.isLeadingToken(bindingId, tokenIndex),
      updateToken: state.updateToken,
      portalRoot: state.getPortalRoot(),
    }));

    const meta = functionMetadata.find((f) => f.name === token.value);
    assertDefined(meta, `Function ${token.value} metadata not found`);

    const selectingName = _selectingName || !meta.args.length;

    const [selectedArgIndex, setSelectedArgIndex] = useState(
      meta.args.length &&
        (!meta.args[0].optional || !isEmptyProgram(token.args[0]))
        ? 0
        : null,
    );

    const argContextType =
      selectedArgIndex != null
        ? getArgContextType(bindingId, tokenIndex, selectedArgIndex)
        : undefined;

    const inputValue =
      selectedArgIndex != null
        ? meta.args[selectedArgIndex].type.type === TypeName.Lambda
          ? getExpressionValue(bindingId, tokenIndex - 1)
          : contextValue
        : undefined;

    const inputSample = inputValue?.valueAt(0);

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
        offset({
          mainAxis: 6,
        }),
        shift({
          padding: 24,
        }),
        flip(),
        size({
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.min(500, Math.max(0, availableHeight))}px`,
            });
          },
        }),
        arrow({
          element: arrowRef,
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

    const toggleGroup = (target: HTMLElement, group: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(group)) {
          next.delete(group);
        } else {
          const parent = target.closest<HTMLElement>(
            `.${style.dropdown.group}`,
          );
          if (parent) {
            scrollIntoView(parent, {
              behavior: "smooth",
              block: "start",
              offset: `-${headerRef.current?.offsetHeight || 0}px`,
            });
          }
          next.add(group);
        }
        return next;
      });
    };

    return (
      <>
        <button
          ref={mergedRefs}
          {...getReferenceProps()}
          data-open={isOpen || undefined}
          className={style.token.function.button}
        >
          {isLeadingToken ? "" : "."}
          {token.value}
          <span className={style.token.function.args}>
            {`(${
              token.args
                .map((arg) =>
                  arg
                    ? truncate(
                        unparseExpression(arg.expression, {
                          bindingsOrder: {},
                          questionnaireItems: {},
                        }),
                        24,
                      )
                    : "",
                )
                .join(", ") || ""
            })`}
          </span>
        </button>
        {isOpen && (
          <FloatingPortal id={portalRoot}>
            <FloatingOverlay className={style.dropdown.backdrop} lockScroll />
            <div className={style.dropdown.arrow} style={floatingStyles}>
              <FloatingArrow
                ref={arrowRef}
                context={context}
                strokeWidth={1}
                height={6}
                width={10}
              />
            </div>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={style.token.function.dropdown}
              {...getFloatingProps()}
            >
              <div className={style.token.function.header} ref={headerRef}>
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
                  argContextType != null &&
                  inputSample != null &&
                  meta.args[selectedArgIndex] !== undefined && (
                    <Argument
                      bindingId={bindingId}
                      tokenIndex={tokenIndex}
                      argIndex={selectedArgIndex}
                      contextType={argContextType}
                      contextValue={inputSample}
                      isLambda={
                        meta.args[selectedArgIndex].type.type ===
                        TypeName.Lambda
                      }
                    />
                  )}
                {selectingName &&
                  (filteredFunctions.length > 0 ? (
                    Object.entries(groupedOptions).map(([group, options]) => (
                      <Fragment key={group}>
                        <div className={style.dropdown.group}>
                          <span>{group}</span>
                          {options.length > 5 && (
                            <button
                              className={style.dropdown.toggle}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                toggleGroup(e.target as HTMLElement, group);
                              }}
                            >
                              {expandedGroups.has(group)
                                ? "Show less"
                                : "Show more"}
                              <CaretDown
                                size={16}
                                style={{
                                  transform: expandedGroups.has(group)
                                    ? "rotate(180deg)"
                                    : "none",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>
                          )}
                        </div>
                        {options
                          .slice(0, expandedGroups.has(group) ? undefined : 5)
                          .map(({ meta, index }) => (
                            <button
                              key={meta.name}
                              ref={(node) => (listRef.current[index] = node)}
                              style={
                                {
                                  "--group-color": colors.function,
                                } as CSSProperties
                              }
                              data-active={activeIndex === index || undefined}
                              {...getItemProps({
                                className: style.dropdown.option,
                                tabIndex: activeIndex === index ? 0 : -1,
                                onClick: () => handleSelectName(meta),
                              })}
                            >
                              <span className={style.dropdown.icon}>
                                <Function size={14} />
                              </span>
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
