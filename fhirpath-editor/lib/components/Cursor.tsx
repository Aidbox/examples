import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useFloating,
  useInteractions,
  useListNavigation,
} from "@floating-ui/react";
import {
  BracketsSquare,
  Calendar,
  CaretDown,
  Clock,
  Empty,
  Flag,
  Function,
  Hash,
  Lightning,
  Plus,
  PuzzlePiece,
  Quotes,
  Scales,
  Shapes,
  Tag,
  Textbox,
  Timer,
} from "@phosphor-icons/react";
import {
  CSSProperties,
  forwardRef,
  Fragment,
  KeyboardEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useProgramContext } from "../utils/store";
import { operatorNames } from "../utils/operator";
import OperatorIcon from "./OperatorIcon";
import {
  IBooleanToken,
  IIndexToken,
  INumberToken,
  IStringToken,
  QuestionnaireItemRegistry,
  SuggestedToken,
  Token,
  TokenGroup,
  TokenKind,
} from "../types/internal";
import { colors, omit, scrollIntoView, weights } from "../utils/misc";
import { useStyle } from "../style";
import { useText } from "../text";
import clx from "classnames";

function lookup(text: string | undefined, term: string): boolean {
  return !!text?.toLowerCase().includes(term.replace(".", "").toLowerCase());
}

type CursorProps = {
  bindingId: string;
  placeholder?: string;
  onBackspace: () => void;
  onMistake: () => void;
};

export type CursorRef = {
  focus: () => void;
  contains: (element: Element) => boolean;
};

function getText(
  token: SuggestedToken,
  items: QuestionnaireItemRegistry,
  text: ReturnType<typeof useText>,
) {
  if (
    token.kind === TokenKind.field ||
    token.kind === TokenKind.function ||
    token.kind === TokenKind.variable
  ) {
    return token.value;
  } else if (token.kind === TokenKind.operator) {
    return operatorNames[token.value];
  } else if (token.kind === TokenKind.answer) {
    return items[token.value]?.text || token.value;
  } else {
    return text.token.labels[token.kind];
  }
}

const Cursor = forwardRef<CursorRef, CursorProps>(
  ({ bindingId, placeholder, onBackspace, onMistake }, ref) => {
    const style = useStyle();
    const text = useText();
    const {
      bindingIndex,
      empty,
      addToken,
      addBinding,
      suggestNextTokens,
      getQuestionnaireItems,
      debug,
      portalRoot,
    } = useProgramContext((state) => ({
      bindingIndex: state.bindingsIndex[`${bindingId}`],
      empty: !state.getBindingExpression(bindingId).length,
      addToken: state.addToken,
      addBinding: state.addBinding,
      suggestNextTokens: state.suggestNextTokens,
      getQuestionnaireItems: state.getQuestionnaireItems,
      debug: state.getDebug(),
      portalRoot: state.getPortalRoot(),
    }));

    const nextTokens = suggestNextTokens(bindingId) || [];
    const items = getQuestionnaireItems();

    const containerRef = useRef<HTMLLabelElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<Array<HTMLButtonElement | null>>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
      new Set(),
    );

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      contains: (element) => {
        return !!containerRef.current?.contains(element);
      },
    }));

    const filteredTokens = nextTokens.filter((token) => {
      return (
        (token.kind != TokenKind.null &&
          lookup(token.value.toString(), search)) ||
        lookup(token.kind, search) ||
        (token.kind === TokenKind.operator &&
          lookup(operatorNames[token.value], search)) ||
        (token.kind === TokenKind.answer &&
          lookup(items[token.value]?.text, search))
      );
    });

    function upsertToken(token: SuggestedToken) {
      const index = filteredTokens.findIndex(({ kind }) => kind === token.kind);
      token.shortcut = true;
      if (index === -1) {
        filteredTokens.splice(0, 0, token);
      } else {
        filteredTokens[index] = token;
      }
    }

    if (search) {
      const numberToken = nextTokens.find(
        (token): token is INumberToken => token.kind === TokenKind.number,
      );
      if (numberToken) {
        if (search.match(/^-?\d+$/) || search.match(/^-?\d*\.\d+$/)) {
          upsertToken({ ...numberToken, value: search });
        }
      }

      const stringToken = nextTokens.find(
        (token): token is IStringToken => token.kind === TokenKind.string,
      );
      if (stringToken) {
        if (search.match(/^["']/)) {
          upsertToken({
            ...stringToken,
            value: search.substring(1),
          });
        }
      }

      const booleanToken = nextTokens.find(
        (token): token is IBooleanToken => token.kind === TokenKind.boolean,
      );
      if (booleanToken) {
        const likeFalse = "false".includes(search);
        const likeTrue = "true".includes(search);
        if (likeFalse || likeTrue) {
          upsertToken({
            ...booleanToken,
            value: likeFalse ? "false" : "true",
          });
        }
      }

      const indexToken = nextTokens.find(
        (token): token is IIndexToken => token.kind === TokenKind.index,
      );
      if (indexToken) {
        if (search.match(/^\[(\d+]?)?$/)) {
          upsertToken({
            ...indexToken,
            value: search.replace(/[^0-9]/g, ""),
          });
        }
      }
    }

    function getGroup(token: SuggestedToken) {
      // prettier-ignore
      return (
        token.kind === TokenKind.variable ? TokenGroup.variable :
        token.kind === TokenKind.operator ? TokenGroup.operator :
        token.kind === TokenKind.function ? TokenGroup.function :
        token.kind === TokenKind.field ? TokenGroup.field :
        token.kind === TokenKind.index ? TokenGroup.index:
        token.kind === TokenKind.answer ? TokenGroup.answer : TokenGroup.literal);
    }

    const groupedTokens = filteredTokens
      .sort(
        (a, b) =>
          (weights[getGroup(a)] ?? Infinity) -
            (weights[getGroup(b)] ?? Infinity) ||
          (a.incompatible ? 1 : 0) - (b.incompatible ? 1 : 0),
      )
      .reduce(
        (acc, token, index) => {
          const group = getGroup(token);

          if (!acc[group]) {
            acc[group] = [];
          }

          acc[group].push({ ...token, index });
          return acc;
        },
        {} as Partial<Record<TokenGroup, SuggestedToken[]>>,
      );

    if (groupedTokens[TokenGroup.literal]?.length === 0) {
      delete groupedTokens[TokenGroup.literal];
    }

    const hideDropdown = (blur = true) => {
      setSearch("");
      setActiveIndex(0);
      if (blur) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (e.shiftKey) {
            addBinding({ name: "var1" }, bindingIndex + 1);
          } else if (filteredTokens[activeIndex]) {
            handleAddToken(filteredTokens[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          hideDropdown();
          break;
        case "Backspace":
          if (search.length === 0) {
            e.preventDefault();
            onBackspace();
          }
          break;
      }
    };

    const finished = nextTokens.length === 0;

    const { refs, floatingStyles, context } = useFloating({
      placement: "bottom-start",
      strategy: "absolute",
      whileElementsMounted: autoUpdate,
      open: isOpen,
      middleware: [
        offset({
          mainAxis: 6,
          crossAxis: -6,
        }),
        shift({
          padding: 24,
        }),
        flip({ padding: 6 }),
        size({
          padding: 6,
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.min(500, Math.max(0, availableHeight))}px`,
            });
          },
        }),
      ],
    });

    const listNav = useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: (index) => setActiveIndex(index || 0),
      virtual: true,
      loop: true,
    });

    const { getReferenceProps, getFloatingProps, getItemProps } =
      useInteractions([listNav]);

    const handleAddToken = (suggestedToken: SuggestedToken) => {
      const blur =
        suggestedToken.kind != TokenKind.null && !suggestedToken.value;
      const token = omit(suggestedToken, [
        "debug",
        "incompatible",
        "shortcut",
        "index",
      ]) as Token;
      addToken(bindingId, token, blur);
      hideDropdown(blur);
      refs.floating.current?.scroll(0, 0);
    };

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
            });
          }
          next.add(group);
        }
        return next;
      });
    };

    return (
      <label
        className={style.binding.cursor.wrapper}
        onMouseDown={(e) => e.preventDefault()}
        ref={(ref) => {
          containerRef.current = ref;
          refs.setReference(ref);
        }}
      >
        {!isOpen && (
          <>
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                inputRef.current?.focus();
              }}
              className={clx(
                style.binding.cursor.button,
                !empty && style.binding.cursor.faded,
              )}
            >
              <Plus size={12} />
            </div>
            <span className={style.binding.cursor.placeholder}>
              {placeholder}
            </span>
          </>
        )}
        <input
          autoComplete="off"
          ref={inputRef}
          className={style.binding.cursor.search}
          data-visible={isOpen || undefined}
          type="text"
          value={search}
          {...getReferenceProps({
            onFocus: () => {
              setIsOpen(true);
            },
            onBlur: (e) => {
              const focusedElement = e.relatedTarget;
              if (
                containerRef.current &&
                !containerRef.current.contains(focusedElement) &&
                !dropdownRef.current?.contains(focusedElement)
              ) {
                hideDropdown();
              }
            },
            onKeyDown: handleKeyDown,
          })}
          onChange={(e) => {
            if (finished) {
              onMistake();
            } else {
              setSearch(e.target.value);
              setActiveIndex(0);
            }
          }}
        />
        {isOpen && (
          <FloatingPortal id={portalRoot}>
            <div
              className={style.binding.cursor.dropdown}
              style={floatingStyles}
              ref={(ref) => {
                dropdownRef.current = ref;
                refs.setFloating(ref);
              }}
              {...getFloatingProps()}
            >
              {Object.entries(groupedTokens).map(
                ([group, tokens]) =>
                  tokens.length > 0 && (
                    <Fragment key={group}>
                      <div className={style.dropdown.group}>
                        <span>{text.cursor.groups[group as TokenGroup]}</span>
                        {tokens.length > 5 && (
                          <button
                            className={style.dropdown.toggle}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleGroup(e.target as HTMLElement, group);
                            }}
                          >
                            {expandedGroups.has(group)
                              ? text.dropdown.group.showLess
                              : text.dropdown.group.showMore}
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
                      {tokens
                        .slice(0, expandedGroups.has(group) ? undefined : 5)
                        .map((token) => (
                          <button
                            tabIndex={-1}
                            ref={(node) => {
                              if (token.index)
                                listRef.current[token.index] = node;
                            }}
                            style={
                              {
                                "--group-color": colors[group as TokenGroup],
                              } as CSSProperties
                            }
                            className={clx(
                              style.dropdown.option,
                              token.incompatible &&
                                style.binding.cursor.incompatible,
                            )}
                            data-active={
                              token.index === activeIndex ? "" : undefined
                            }
                            key={
                              token.kind +
                              (token.kind !== TokenKind.null
                                ? token.value || ""
                                : "")
                            }
                            {...getItemProps({
                              onClick: () => {
                                inputRef.current?.focus();
                                handleAddToken(token);
                              },
                            })}
                          >
                            <span className={style.dropdown.icon}>
                              {token.kind === TokenKind.null ? (
                                <Empty size={14} />
                              ) : token.kind === TokenKind.string ? (
                                <Quotes size={14} />
                              ) : token.kind === TokenKind.number ? (
                                <Hash size={14} />
                              ) : token.kind === TokenKind.variable ? (
                                <PuzzlePiece size={14} />
                              ) : token.kind === TokenKind.boolean ? (
                                <Flag size={14} />
                              ) : token.kind === TokenKind.date ? (
                                <Calendar size={14} />
                              ) : token.kind === TokenKind.datetime ? (
                                <Clock size={14} />
                              ) : token.kind === TokenKind.time ? (
                                <Timer size={14} />
                              ) : token.kind === TokenKind.quantity ? (
                                <Scales size={14} />
                              ) : token.kind === TokenKind.type ? (
                                <Tag size={14} />
                              ) : token.kind === TokenKind.index ? (
                                <BracketsSquare size={14} />
                              ) : token.kind === TokenKind.field ? (
                                <Shapes size={14} />
                              ) : token.kind === TokenKind.function ? (
                                <Function size={14} />
                              ) : token.kind === TokenKind.answer ? (
                                <Textbox size={14} />
                              ) : token.kind === TokenKind.operator ? (
                                <OperatorIcon name={token.value} size={14} />
                              ) : null}
                            </span>
                            <span className={style.dropdown.primary}>
                              {getText(token, items, text)}
                            </span>
                            {token.shortcut ? (
                              <Lightning
                                size={14}
                                weight="fill"
                                className={style.binding.cursor.shortcut}
                              />
                            ) : debug && token.debug ? (
                              <span className={style.dropdown.secondary}>
                                {token.debug}
                              </span>
                            ) : null}
                          </button>
                        ))}
                    </Fragment>
                  ),
              )}

              {nextTokens.length > 0 && filteredTokens.length === 0 && (
                <div className={style.dropdown.empty}>
                  <Empty size={16} /> {text.dropdown.empty.nothingFound}
                </div>
              )}
            </div>
          </FloatingPortal>
        )}
      </label>
    );
  },
);

export default Cursor;
