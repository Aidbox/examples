import {
  autoUpdate,
  offset,
  useFloating,
  shift,
  flip,
} from "@floating-ui/react-dom";
import {
  ArrowElbowDownRight,
  ArrowFatRight,
  ArrowLineRight,
  ArrowRight,
  Backspace,
  Calculator,
  Code,
  Empty,
  Flag,
  FlagCheckered,
  Hash,
  Info,
  Lightning,
  Quotes,
} from "@phosphor-icons/react";
import React, { forwardRef } from "react";
import { createPortal } from "react-dom";
import mergeRefs from "../utils/react";

const labels = {
  number: "Number",
  string: "String",
  variable: "Variable",
  field: "Field",
  operator: "Operator",
  boolean: "Boolean",
};

const Cursor = forwardRef(
  (
    {
      id,
      nextTokens,
      onAddToken,
      onDeleteToken,
      hovering,
      onMistake,
      empty,
      bindings,
    },
    forwardingRef
  ) => {
    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const [dropdownVisible, setDropdownVisible] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [selected, setSelected] = React.useState(0);

    const tokens = nextTokens.filter((token) => {
      const label = token.value || labels[token.type];
      return label.toLowerCase().includes(search.toLowerCase());
    });

    if (tokens.length === 0) {
      const variable = nextTokens.find(({ type }) => type === "variable");

      if (variable) {
        if (bindings.find((binding) => binding.name === search)) {
          tokens.push({ ...variable, value: search });
        }
      }

      const number = nextTokens.find(({ type }) => type === "number");
      if (number && search.match(/^\-?\d+$/)) {
        tokens.push({ ...number, value: search });
      }

      const string = nextTokens.find(({ type }) => type === "string");
      if (string) {
        tokens.push({ ...string, value: search });
      }
    }

    const addToken = (token) => {
      let blur = !token.value;
      onAddToken(token, blur);
      hideDropdown(blur);
    };

    const hideDropdown = (blur = true) => {
      setSearch("");
      setSelected(0);
      if (blur) {
        setDropdownVisible(false);
        inputRef.current?.blur();
      }
    };

    React.useEffect(() => {
      if (!dropdownVisible) return;

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
    }, [dropdownVisible]);

    const handleKeyDown = (e) => {
      if (!dropdownVisible) return;

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
            addToken(tokens[selected]);
          }
          break;
        case "Escape":
          e.preventDefault();
          hideDropdown();
          break;
        case "Backspace":
          if (search.length === 0) {
            e.preventDefault();
            onDeleteToken();
          }
          break;
      }
    };

    const visible = hovering || dropdownVisible;
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
      ],
    });

    return (
      <div
        className="relative"
        ref={(ref) => {
          containerRef.current = ref;
          refs.setReference(ref && ref.parentElement);
        }}
      >
        {visible && !search && !dropdownVisible && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputRef.current?.focus();
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 mx-0.5 hover:text-blue-500 cursor-pointer"
          >
            {nextTokens.length > 0 ? (
              <ArrowRight weight="bold" size={16} />
            ) : (
              <ArrowLineRight weight="bold" size={16} />
            )}
          </div>
        )}
        <input
          autoComplete="off"
          ref={mergeRefs(forwardingRef, inputRef)}
          className="focus:outline-none field-sizing-content data-[visible]:min-w-5 indent-0.5"
          data-visible={visible || undefined}
          id={id}
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
            setDropdownVisible(true);
          }}
          onBlur={(e) => {
            const focusedElement = e.relatedTarget;
            if (
              containerRef.current &&
              !containerRef.current.contains(focusedElement) &&
              !dropdownRef.current.contains(focusedElement)
            ) {
              hideDropdown();
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {dropdownVisible &&
          createPortal(
            <div
              className="mt-1 bg-white border border-gray-300 rounded-md shadow-lg min-w-[160px] empty:hidden py-2"
              style={floatingStyles}
              ref={(ref) => {
                dropdownRef.current = ref;
                refs.setFloating(ref);
              }}
            >
              {tokens.length > 0
                ? tokens.map((token, index) => (
                    <button
                      key={
                        token.type +
                        (typeof token === "string" ? "" : token.value)
                      }
                      className={`w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_0.75rem] items-center gap-2 cursor-pointer ${
                        index === selected ? "bg-gray-100" : ""
                      }`}
                      tabIndex="-1"
                      onMouseEnter={() => setSelected(index)}
                      onClick={(e) => {
                        inputRef.current?.focus();
                        addToken(token);
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
                      ) : token.type === "field" ? (
                        <ArrowElbowDownRight
                          size={16}
                          className="text-gray-500"
                        />
                      ) : token.type === "operator" ? (
                        <Calculator size={16} className="text-gray-500" />
                      ) : null}
                      {token.type === "field"
                        ? token.value
                        : labels[token.type]}
                      {token.value && token.type !== "field" && (
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
            </div>,
            document.getElementById("portal")
          )}
      </div>
    );
  }
);

export default Cursor;
