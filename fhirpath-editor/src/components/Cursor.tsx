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
  forwardRef,
  Fragment,
  KeyboardEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useProgramContext } from "@/utils/store";
import { useDebug } from "@/utils/react";
import { operatorNames } from "@/utils/operator";
import OperatorIcon from "@/components/OperatorIcon";
import {
  IBooleanToken,
  IIndexToken,
  INumberToken,
  IStringToken,
  ISuggestedToken,
  IToken,
  TokenType,
} from "@/types/internal";
import { QuestionnaireItemRegistry } from "@/utils/questionnaire.ts";
import { omit } from "@/utils/misc.ts";

const labels = {
  number: "Number",
  string: "String",
  boolean: "Boolean",
  date: "Date",
  datetime: "Date and time",
  time: "Time",
  quantity: "Quantity",
  type: "Type",
  index: "Index",
};

function lookup(text: string | undefined, term: string): boolean {
  return !!text?.toLowerCase().includes(term.replace(".", "").toLowerCase());
}

interface ICursorProps {
  bindingId: string | null;
  placeholder?: string;
  onBackspace: () => void;
  onMistake: () => void;
}

export interface ICursorRef {
  focus: () => void;
  contains: (element: Element) => boolean;
}

function getText(token: IToken, items: QuestionnaireItemRegistry) {
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
    return labels[token.type];
  }
}

const Cursor = forwardRef<ICursorRef, ICursorProps>(
  ({ bindingId, placeholder, onBackspace, onMistake }, ref) => {
    const {
      bindingIndex,
      empty,
      addToken,
      addBinding,
      suggestNextTokens,
      getQuestionnaireItems,
    } = useProgramContext((state) => ({
      bindingIndex: state.bindingsIndex[`${bindingId}`],
      empty: !state.getBindingExpression(bindingId).length,
      addToken: state.addToken,
      addBinding: state.addBinding,
      suggestNextTokens: state.suggestNextTokens,
      getQuestionnaireItems: state.getQuestionnaireItems,
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
    const debug = useDebug();

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

    function upsertToken(token: ISuggestedToken) {
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
          token.type === TokenType.variable ? "Named expressions" :
          token.type === TokenType.operator ? "Operators" :
          token.type === TokenType.function ? "Functions" :
          token.type === TokenType.field ? "Fields" :
          token.type === TokenType.index ? "Indexes" :
          token.type === TokenType.answer ? "Questionnaire" : "Literals";

        if (!acc[group]) {
          acc[group] = [];
        }

        acc[group].push({ ...token, index });
        return acc;
      },
      { Literals: [] } as Record<string, ISuggestedToken[]>,
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

    const handleAddToken = (suggestedToken: ISuggestedToken) => {
      let blur = !suggestedToken.value;
      const token = omit(suggestedToken, [
        "debug",
        "incompatible",
        "shortcut",
        "index",
      ]) as IToken;
      addToken(bindingId, token, blur);
      hideDropdown(blur);
      refs.floating.current?.scroll(0, 0);
    };

    return (
      <label
        className={`relative flex items-center flex-1 cursor-pointer group/cursor`}
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
            className={`text-gray-600 cursor-pointer py-0.5 px-0.5 grid place-items-center rounded border border-gray-300 bg-white ${!empty ? "opacity-50 group-hover/cursor:opacity-100" : ""}`}
            data-icon={!placeholder || undefined}
          >
            <Plus size={12} />
          </div>
        )}
        <input
          autoComplete="off"
          ref={inputRef}
          className="focus:outline-none text-slate-600 w-0 data-[visible]:w-auto data-[visible]:field-sizing-content data-[visible]:min-w-5"
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
          <FloatingPortal>
            <div
              className="bg-white border border-gray-300 rounded-md shadow-lg min-w-72 max-w-92 empty:hidden overflow-y-auto focus:outline-none"
              style={floatingStyles}
              ref={(ref) => {
                dropdownRef.current = ref;
                refs.setFloating(ref);
              }}
              {...getFloatingProps()}
              data-testid="cursor-dropdown"
            >
              {Object.entries(groupedTokens).map(([group, tokens]) => (
                <Fragment key={group}>
                  <div className="text-sm font-semibold text-gray-500 px-3 py-3 pb-1 truncate sticky top-0 bg-white z-10">
                    {group}
                  </div>
                  {tokens.map((token) => (
                    <button
                      tabIndex={-1}
                      ref={(node) => {
                        if (token.index) listRef.current[token.index] = node;
                      }}
                      className="w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_auto] items-center gap-2 cursor-pointer data-[active]:bg-gray-100 data-[incompatible]:opacity-50"
                      data-active={token.index === activeIndex ? "" : undefined}
                      data-incompatible={token.incompatible || undefined}
                      key={token.type + (token.value || "")}
                      {...getItemProps({
                        onClick: () => {
                          inputRef.current?.focus();
                          handleAddToken(token);
                        },
                      })}
                    >
                      {token.type === TokenType.string ? (
                        <Quotes size={16} className="text-gray-500" />
                      ) : token.type === TokenType.number ? (
                        <Hash size={16} className="text-gray-500" />
                      ) : token.type === TokenType.variable ? (
                        <PuzzlePiece size={16} className="text-gray-500" />
                      ) : token.type === TokenType.boolean ? (
                        <Flag size={16} className="text-gray-500" />
                      ) : token.type === TokenType.date ? (
                        <Calendar size={16} className="text-gray-500" />
                      ) : token.type === TokenType.datetime ? (
                        <Clock size={16} className="text-gray-500" />
                      ) : token.type === TokenType.time ? (
                        <Timer size={16} className="text-gray-500" />
                      ) : token.type === TokenType.quantity ? (
                        <Scales size={16} className="text-gray-500" />
                      ) : token.type === TokenType.type ? (
                        <Tag size={16} className="text-gray-500" />
                      ) : token.type === TokenType.index ? (
                        <BracketsSquare size={16} className="text-gray-500" />
                      ) : token.type === TokenType.field ? (
                        <Shapes size={16} className="text-gray-500" />
                      ) : token.type === TokenType.function ? (
                        <Function size={16} className="text-gray-500" />
                      ) : token.type === TokenType.answer ? (
                        <Textbox size={16} className="text-gray-500" />
                      ) : token.type === TokenType.operator ? (
                        <OperatorIcon name={token.value} />
                      ) : null}
                      {getText(token, items)}
                      {token.shortcut ? (
                        <Lightning
                          size={14}
                          weight="fill"
                          className="text-yellow-500"
                        />
                      ) : debug && token.debug ? (
                        <span className="text-sm text-gray-500 truncate flex-1 text-right">
                          {token.debug}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </Fragment>
              ))}

              {nextTokens.length > 0 && filteredTokens.length === 0 && (
                <div className="text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-2 mt-1 first:mt-0">
                  <Empty size={16} /> No matching tokens found
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
