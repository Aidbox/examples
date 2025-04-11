import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react";
import {
  ArrowLineRight,
  ArrowRight,
  Backspace,
  BracketsSquare,
  Calculator,
  Calendar,
  Clock,
  Code,
  Empty,
  Flag,
  Function,
  Hash,
  Info,
  Lightning,
  Quotes,
  Scales,
  Shapes,
  Tag,
  Timer,
} from "@phosphor-icons/react";
import React, { forwardRef, useImperativeHandle } from "react";
import { useProgramContext } from "@utils/store.jsx";

const labels = {
  number: "Number",
  string: "String",
  variable: "Variable",
  field: "Field",
  operator: "Operator",
  boolean: "Boolean",
  date: "Date",
  datetime: "DateTime",
  time: "Time",
  quantity: "Quantity",
  type: "Type",
  index: "Index",
};

const Cursor = forwardRef(
  ({ bindingId, hovering, placeholder, onBackspace, onMistake }, ref) => {
    const precedingBindings = useProgramContext((state) =>
      state.getPrecedingBindings(bindingId),
    );

    const { addToken, empty, suggestNextToken } = useProgramContext(
      (state) => ({
        empty: !state.getBindingExpression(bindingId).length,
        addToken: state.addToken,
        suggestNextToken: state.suggestNextToken,
      }),
    );

    const nextTokens = suggestNextToken(bindingId);

    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [selected, setSelected] = React.useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      contains: (element) => {
        return containerRef.current?.contains(element);
      },
    }));

    const tokens = nextTokens.filter((token) => {
      const label = token.value || labels[token.type] || token.type;
      return label.toLowerCase().includes(search.toLowerCase());
    });

    if (tokens.length === 0) {
      const variable = nextTokens.find(({ type }) => type === "variable");

      if (variable) {
        if (precedingBindings.find((binding) => binding.name === search)) {
          tokens.push({ ...variable, value: search });
        }
      }

      const number = nextTokens.find(({ type }) => type === "number");
      if (number) {
        // Integer pattern
        if (search.match(/^-?\d+$/)) {
          tokens.push({ ...number, value: search });
        }
        // Decimal pattern
        else if (search.match(/^-?\d*\.\d+$/)) {
          tokens.push({ ...number, value: search });
        }
      }

      const index = nextTokens.find(({ type }) => type === "index");
      if (index) {
        if (search.match(/^\[(\d+\]?)?$/)) {
          tokens.push({ ...index, value: search.replace(/[^0-9]/g, "") });
        }
      }

      const string = nextTokens.find(({ type }) => type === "string");
      if (string) {
        tokens.push({ ...string, value: search });
      }
    }

    const handleAddToken = (token) => {
      let blur = !token.value;
      addToken(bindingId, token, blur);
      hideDropdown(blur);
    };

    const hideDropdown = (blur = true) => {
      setSearch("");
      setSelected(0);
      if (blur) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          !containerRef.current.contains(event.target)
        ) {
          hideDropdown();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelected((prev) => (prev < tokens.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelected((prev) => (prev > 0 ? prev - 1 : tokens.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (tokens[selected]) {
            handleAddToken(tokens[selected]);
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

    const visible = hovering || isOpen;
    const finished = nextTokens.length === 0;

    const { refs, floatingStyles } = useFloating({
      placement: "right-start",
      strategy: "absolute",
      whileElementsMounted: autoUpdate,
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

    return (
      <div
        className="relative flex items-center"
        ref={(ref) => {
          containerRef.current = ref;
          refs.setReference(ref && ref.parentElement);
        }}
      >
        {(visible || (placeholder && empty)) && !search && !isOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputRef.current?.focus();
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-blue-500 cursor-pointer min-w-6 justify-center"
            data-icon={!placeholder || undefined}
          >
            {placeholder && empty && (
              <div className="text-sm">{placeholder}</div>
            )}
            {nextTokens.length > 0 ? (
              <ArrowRight weight="bold" size={16} />
            ) : (
              <ArrowLineRight weight="bold" size={16} />
            )}
          </div>
        )}
        <input
          autoComplete="off"
          ref={inputRef}
          className="focus:outline-none field-sizing-content data-[visible]:min-w-5 indent-0.5 data-[visible]:ml-1"
          data-visible={isOpen || undefined}
          type="text"
          value={search}
          onChange={(e) => {
            if (finished) {
              onMistake();
            } else {
              setSearch(e.target.value);
              setSelected(0);
            }
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onBlur={(e) => {
            const focusedElement = e.relatedTarget;
            if (
              containerRef.current &&
              !containerRef.current.contains(focusedElement) &&
              !dropdownRef.current.contains(focusedElement)
            ) {
              // hideDropdown();
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {isOpen && (
          <FloatingPortal>
            <div
              className="bg-white border border-gray-300 rounded-md shadow-lg min-w-[160px] empty:hidden py-2 overflow-y-auto"
              style={floatingStyles}
              ref={(ref) => {
                dropdownRef.current = ref;
                refs.setFloating(ref);
              }}
              data-testid="cursor-dropdown"
            >
              {tokens.length > 0
                ? tokens.map((token, index) => (
                    <button
                      key={
                        token.type +
                        (typeof token === "string" ? "" : token.value)
                      }
                      className={`w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_0.75rem] items-center gap-2 cursor-pointer active:bg-gray-200 ${
                        index === selected ? "bg-gray-100" : ""
                      }`}
                      tabIndex="-1"
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => {
                        inputRef.current?.focus();
                        handleAddToken(token);
                      }}
                    >
                      {token.type === "string" ? (
                        <Quotes size={16} className="text-gray-500" />
                      ) : token.type === "number" ? (
                        <Hash size={16} className="text-gray-500" />
                      ) : token.type === "variable" ? (
                        <Code size={16} className="text-gray-500" />
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
                        <Calculator size={16} className="text-gray-500" />
                      ) : null}
                      {token.type === "field" || token.type === "function"
                        ? token.value
                        : labels[token.type]}
                      {token.value &&
                        token.type !== "field" &&
                        token.type !== "function" && (
                          <Lightning
                            size={14}
                            weight="fill"
                            className="text-yellow-500"
                          />
                        )}
                    </button>
                  ))
                : null}

              {nextTokens.length > 0 && tokens.length === 0 && (
                <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-2 mt-1 first:mt-0">
                  <Empty size={16} /> No matching tokens found
                </div>
              )}

              {search === "" && (
                <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-2 mt-1 first:mt-0">
                  <Info size={16} /> Double press{" "}
                  <Backspace
                    size={16}
                    weight="fill"
                    className="text-gray-400"
                  />{" "}
                  backspace to remove {empty ? "the binding" : "the last token"}
                </div>
              )}
            </div>
          </FloatingPortal>
        )}
      </div>
    );
  },
);

export default Cursor;
