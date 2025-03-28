import React from "react";

const Cursor = ({ id, suggestions, onAddToken, onDeleteToken, hovering }) => {
  const dropdownRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const icons = {
    number: "fa-hashtag",
    string: "fa-quote-right",
    variable: "fa-code",
    field: "fa-dot-circle",
    operator: "fa-calculator",
  };

  const labels = {
    number: "Number",
    string: "String",
    variable: "Variable",
    field: "Field",
    operator: "Operator",
  };

  // Filter suggestions based on search text
  const filteredSuggestions = suggestions.filter((suggestion) => {
    const label =
      typeof suggestion === "string" ? labels[suggestion] : suggestion.label;
    return label.toLowerCase().includes(searchText.toLowerCase());
  });

  const hideSuggestions = () => {
    setShowSuggestions(false);
    setSearchText("");
    setSelectedIndex(0);
    inputRef.current?.blur();
  };

  React.useEffect(() => {
    if (!showSuggestions) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        hideSuggestions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          onAddToken(filteredSuggestions[selectedIndex]);
          hideSuggestions();
        }
        break;
      case "Escape":
        e.preventDefault();
        hideSuggestions();
        break;
      case "Backspace":
        if (searchText.length === 0) {
          e.preventDefault();
          onDeleteToken();
        }
        break;
    }
  };

  const visible = hovering || showSuggestions;

  return (
    <div className={`relative`} ref={dropdownRef}>
      <input
        autoComplete="off"
        ref={inputRef}
        className="focus:outline-none field-sizing-content"
        id={id}
        type="text"
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          setSelectedIndex(0);
        }}
        onFocus={() => {
          setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={visible ? "..." : ""}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-[160px] empty:hidden">
          {filteredSuggestions.map((suggestion, index) => {
            const type =
              typeof suggestion === "string" ? suggestion : suggestion.type;
            const label =
              typeof suggestion === "string"
                ? labels[suggestion]
                : suggestion.label;
            return (
              <button
                key={
                  type +
                  (typeof suggestion === "string" ? "" : suggestion.field)
                }
                className={`w-full px-3 py-2 text-left first:rounded-t-md last:rounded-b-md grid grid-cols-[1rem_1fr] items-center gap-2 ${
                  index === selectedIndex ? "bg-gray-100" : ""
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddToken(suggestion);
                  hideSuggestions();
                }}
              >
                <i className={`text-xs text-gray-500 fas ${icons[type]}`}></i>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cursor;
