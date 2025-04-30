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
  TokenType,
} from "../types/internal";
import { colors, memoize, omit } from "../utils/misc";
import { useStyle } from "../style";
import { useText } from "../text";
import clx from "classnames";

let colorIndex = 0;
const color = memoize(() => colors[colorIndex++ % colors.length]) as (
  group: string,
) => string;

function lookup(text: string | undefined, term: string): boolean {
  return !!text?.toLowerCase().includes(term.replace(".", "").toLowerCase());
}

type CursorProps = {
  bindingId: string;
  onBackspace: () => void;
  onMistake: () => void;
};

export type CursorRef = {
  focus: () => void;
  contains: (element: Element) => boolean;
};

function getText(
  token: Token,
  items: QuestionnaireItemRegistry,
  text: ReturnType<typeof useText>,
) {
  if (
    token.type === TokenType.field ||
    token.type === TokenType.function ||
    token.type === TokenType.variable
  ) {
    return token.value;
  } else if (token.type === TokenType.operator) {
    return operatorNames[token.value];
  } else if (token.type === TokenType.answer) {
    return items[token.value]?.text || token.value;
  } else {
    return text.token.labels[token.type];
  }
}

const Cursor = forwardRef<CursorRef, CursorProps>(
  ({ bindingId, onBackspace, onMistake }, ref) => {
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
        lookup(token.value.toString(), search) ||
        lookup(token.type, search) ||
        (token.type === TokenType.operator &&
          lookup(operatorNames[token.value], search)) ||
        (token.type === TokenType.answer &&
          lookup(items[token.value]?.text, search))
      );
    });

    function upsertToken(token: SuggestedToken) {
      const index = filteredTokens.findIndex(({ type }) => type === token.type);
      token.shortcut = true;
      if (index === -1) {
        filteredTokens.splice(0, 0, token);
      } else {
        filteredTokens[index] = token;
      }
    }

    if (search) {
      const numberToken = nextTokens.find(
        (token): token is INumberToken => token.type === TokenType.number,
      );
      if (numberToken) {
        if (search.match(/^-?\d+$/) || search.match(/^-?\d*\.\d+$/)) {
          upsertToken({ ...numberToken, value: search });
        }
      }

      const stringToken = nextTokens.find(
        (token): token is IStringToken => token.type === TokenType.string,
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
        (token): token is IBooleanToken => token.type === TokenType.boolean,
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
        (token): token is IIndexToken => token.type === TokenType.index,
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

    const groupedTokens = filteredTokens.reduce(
      (acc, token, index) => {
        // prettier-ignore
        const group =
          // token.shortcut ? "Quick actions" :
          token.type === TokenType.variable ? text.cursor.groups.namedExpressions :
          token.type === TokenType.operator ? text.cursor.groups.operators :
          token.type === TokenType.function ? text.cursor.groups.functions :
          token.type === TokenType.field ? text.cursor.groups.fields :
          token.type === TokenType.index ? text.cursor.groups.indexes :
          token.type === TokenType.answer ? text.cursor.groups.questionnaire : text.cursor.groups.literals

        if (!acc[group]) {
          acc[group] = [];
        }

        acc[group].push({ ...token, index });
        return acc;
      },
      {
        [text.cursor.groups.questionnaire]: [],
        [text.cursor.groups.namedExpressions]: [],
        [text.cursor.groups.literals]: [],
      } as Record<string, SuggestedToken[]>,
    );

    if (groupedTokens["Literals"].length === 0) {
      delete groupedTokens["Literals"];
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
        shift({ padding: 6 }),
        flip({ padding: 6 }),
        size({
          padding: 6,
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.max(0, availableHeight)}px`,
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
      const blur = !suggestedToken.value;
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

    const toggleGroup = (group: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(group)) {
          next.delete(group);
        } else {
          next.add(group);
        }
        return next;
      });
    };

    return (
      <label
        className={style.binding.cursor.wrapper}
        ref={(ref) => {
          containerRef.current = ref;
          refs.setReference(ref);
        }}
      >
        {!isOpen && (
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
                        <span>{group}</span>
                        {tokens.length > 5 && (
                          <button
                            className={style.dropdown.toggle}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleGroup(group);
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
                                "--group-color": color(group),
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
                            key={token.type + (token.value || "")}
                            {...getItemProps({
                              onClick: () => {
                                inputRef.current?.focus();
                                handleAddToken(token);
                              },
                            })}
                          >
                            <span className={style.dropdown.icon}>
                              {token.type === TokenType.string ? (
                                <Quotes size={14} />
                              ) : token.type === TokenType.number ? (
                                <Hash size={14} />
                              ) : token.type === TokenType.variable ? (
                                <PuzzlePiece size={14} />
                              ) : token.type === TokenType.boolean ? (
                                <Flag size={14} />
                              ) : token.type === TokenType.date ? (
                                <Calendar size={14} />
                              ) : token.type === TokenType.datetime ? (
                                <Clock size={14} />
                              ) : token.type === TokenType.time ? (
                                <Timer size={14} />
                              ) : token.type === TokenType.quantity ? (
                                <Scales size={14} />
                              ) : token.type === TokenType.type ? (
                                <Tag size={14} />
                              ) : token.type === TokenType.index ? (
                                <BracketsSquare size={14} />
                              ) : token.type === TokenType.field ? (
                                <Shapes size={14} />
                              ) : token.type === TokenType.function ? (
                                <Function size={14} />
                              ) : token.type === TokenType.answer ? (
                                <Textbox size={14} />
                              ) : token.type === TokenType.operator ? (
                                <OperatorIcon name={token.value} size={14} />
                              ) : null}
                            </span>
                            {getText(token, items, text)}
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
