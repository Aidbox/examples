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
  ArrowLineRight,
  ArrowRight,
  BracketsSquare,
  Calendar,
  Clock,
  Empty,
  Flag,
  Function,
  Hash,
  Lightning,
  Plus,
  PlusCircle,
  PuzzlePiece,
  Quotes,
  Scales,
  Shapes,
  Tag,
  Timer,
} from "@phosphor-icons/react";
import React, {
  forwardRef,
  Fragment,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useProgramContext } from "@utils/store.js";
import { useDebug } from "@utils/react.js";
import { operatorNames } from "@utils/operator.js";
import OperatorIcon from "@components/OperatorIcon.jsx";

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

const Cursor = forwardRef(
  ({ bindingId, placeholder, onBackspace, onMistake }, ref) => {
    const precedingBindings = useProgramContext((state) =>
      state.getPrecedingBindings(bindingId),
    );

    const { empty, addToken, suggestNextToken } = useProgramContext(
      (state) => ({
        empty: !state.getBindingExpression(bindingId).length,
        addToken: state.addToken,
        suggestNextToken: state.suggestNextToken,
      }),
    );

    const nextTokens = suggestNextToken(bindingId);

    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const debug = useDebug();

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      contains: (element) => {
        return containerRef.current?.contains(element);
      },
    }));

    const filteredTokens = nextTokens.filter((token) => {
      return (
        token.value?.toLowerCase().includes(search.toLowerCase()) ||
        token.type?.toLowerCase().includes(search.toLowerCase()) ||
        (token.type === "operator" &&
          operatorNames[token.value]
            ?.toLowerCase()
            .includes(search.toLowerCase()))
      );
    });

    if (filteredTokens.length === 0) {
      const variable = nextTokens.find(({ type }) => type === "variable");

      if (variable) {
        if (precedingBindings.find((binding) => binding.name === search)) {
          filteredTokens.push({ ...variable, value: search, shortcut: true });
        }
      }

      const number = nextTokens.find(({ type }) => type === "number");
      if (number) {
        // Integer pattern
        if (search.match(/^-?\d+$/)) {
          filteredTokens.push({ ...number, value: search, shortcut: true });
        }
        // Decimal pattern
        else if (search.match(/^-?\d*\.\d+$/)) {
          filteredTokens.push({ ...number, value: search, shortcut: true });
        }
      }

      const index = nextTokens.find(({ type }) => type === "index");
      if (index) {
        if (search.match(/^\[(\d+\]?)?$/)) {
          filteredTokens.push({
            ...index,
            value: search.replace(/[^0-9]/g, ""),
            shortcut: true,
          });
        }
      }

      const string = nextTokens.find(({ type }) => type === "string");
      if (string) {
        filteredTokens.push({ ...string, value: search, shortcut: true });
      }
    }

    const groupedTokens = filteredTokens.reduce((acc, token, index) => {
      const group =
        token.type === "number" ||
        token.type === "string" ||
        token.type === "boolean" ||
        token.type === "date" ||
        token.type === "datetime" ||
        token.type === "time" ||
        token.type === "quantity" ||
        token.type === "type"
          ? "Literals"
          : token.type === "variable"
            ? "Named expressions"
            : token.type === "operator"
              ? "Operators"
              : token.type === "function"
                ? "Functions"
                : token.type === "field"
                  ? "Fields"
                  : token.type === "index"
                    ? "Indexes"
                    : "Other";

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push({ ...token, index });
      return acc;
    }, {});

    const handleAddToken = (token) => {
      let blur = !token.value;
      addToken(bindingId, token, blur);
      hideDropdown(blur);
    };

    const hideDropdown = (blur = true) => {
      setSearch("");
      setActiveIndex(0);
      if (blur) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (filteredTokens[activeIndex]) {
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
      onNavigate: setActiveIndex,
      virtual: true,
      loop: true,
    });

    const { getReferenceProps, getFloatingProps, getItemProps } =
      useInteractions([listNav]);

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
                !dropdownRef.current.contains(focusedElement)
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
              className="bg-white border border-gray-300 rounded-md shadow-lg min-w-52 max-w-72 empty:hidden py-2 overflow-y-auto focus:outline-none"
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
                  <div className="font-semibold text-gray-500 px-3 not-first:pt-3 pb-1 col-span-2">
                    {group}
                  </div>
                  {tokens.map((token) => (
                    <button
                      key={token.type + (token.value || "")}
                      {...getItemProps({
                        className: `w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_auto] items-center gap-2 cursor-pointer ${
                          token.index === activeIndex ? "bg-gray-100" : ""
                        }`,
                        tabIndex: "-1",
                        ref: (node) => (listRef.current[token.index] = node),
                        onClick: () => {
                          inputRef.current?.focus();
                          handleAddToken(token);
                        },
                      })}
                    >
                      {token.type === "string" ? (
                        <Quotes size={16} className="text-gray-500" />
                      ) : token.type === "number" ? (
                        <Hash size={16} className="text-gray-500" />
                      ) : token.type === "variable" ? (
                        <PuzzlePiece size={16} className="text-gray-500" />
                      ) : token.type === "boolean" ? (
                        <Flag size={16} className="text-gray-500" />
                      ) : token.type === "date" ? (
                        <Calendar size={16} className="text-gray-500" />
                      ) : token.type === "datetime" ? (
                        <Clock size={16} className="text-gray-500" />
                      ) : token.type === "time" ? (
                        <Timer size={16} className="text-gray-500" />
                      ) : token.type === "quantity" ? (
                        <Scales size={16} className="text-gray-500" />
                      ) : token.type === "type" ? (
                        <Tag size={16} className="text-gray-500" />
                      ) : token.type === "index" ? (
                        <BracketsSquare size={16} className="text-gray-500" />
                      ) : token.type === "field" ? (
                        <Shapes size={16} className="text-gray-500" />
                      ) : token.type === "function" ? (
                        <Function size={16} className="text-gray-500" />
                      ) : token.type === "operator" ? (
                        <OperatorIcon name={token.value} />
                      ) : null}
                      {token.type === "field" ||
                      token.type === "function" ||
                      token.type === "variable"
                        ? token.value
                        : token.type === "operator"
                          ? operatorNames[token.value]
                          : labels[token.type]}
                      {token.shortcut ? (
                        <Lightning
                          size={14}
                          weight="fill"
                          className="text-yellow-500"
                        />
                      ) : debug && token.debug ? (
                        <span className="text-gray-500 whitespace-nowrap pl-2 truncate">
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
