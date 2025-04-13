import React, { Fragment, useRef, useState } from "react";
import { useProgramContext } from "@utils/store.jsx";
import { UcumLhcUtils, UnitTables } from "@lhncbc/ucum-lhc";
import { useDebug } from "@utils/react.js";
import {
  autoUpdate,
  flip,
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
import { Plus, PuzzlePiece } from "@phosphor-icons/react";
import { stringifyType } from "@utils/type.js";
import { upperFirst } from "@utils/misc.js";

UcumLhcUtils.getInstance();

const units = [
  { value: "year", group: "time", name: "calendar year" },
  { value: "month", group: "time", name: "calendar month" },
  { value: "week", group: "time", name: "calendar week" },
  { value: "day", group: "time", name: "calendar day" },
  { value: "hour", group: "time", name: "calendar hour" },
  { value: "minute", group: "time", name: "calendar minute" },
  { value: "second", group: "time", name: "calendar second" },
  { value: "millisecond", group: "time", name: "millisecond" },
  ...Object.values(UnitTables.getInstance().unitCodes_).map((unit) => ({
    value: unit.csCode_,
    group: unit.property_,
    name: unit.name_,
  })),
];

const QuantityToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const valueEmpty = token.value.value === "";
  const unitEmpty = !token.value.unit || token.value.unit === "";
  const invalid = false;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const listRef = useRef([]);
  const debug = useDebug();

  const filteredUnits = units
    .filter(
      (unit) =>
        unit.value.toLowerCase().includes(search.toLowerCase()) ||
        unit.name.toLowerCase().includes(search.toLowerCase()),
    )
    .map((unit, index) => ({ ...unit, index }));

  const groupedUnits = filteredUnits.reduce((acc, unit) => {
    const group = upperFirst(unit.group);
    if (!acc[group]) acc[group] = [];
    acc[group].push(unit);
    return acc;
  }, {});

  const { refs, floatingStyles, context } = useFloating({
    placement: "right",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) {
        setSearch("");
      }
    },
    middleware: [
      offset({
        mainAxis: 6,
      }),
      shift(),
      flip(),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(0, availableHeight)}px`,
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

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNav],
  );

  const handleSelect = (unit) => {
    updateToken(bindingId, tokenIndex, (token) => {
      token.value.unit = unit;
    });
    setIsOpen(false);
    setSearch("");
  };

  const mergedRefs = useMergeRefs([ref, refs.setReference]);

  return (
    <div
      className="inline-flex data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300 data-[empty]:rounded-md"
      data-testid="quantity-token"
      data-empty={valueEmpty || undefined}
    >
      <input
        ref={ref}
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-l-md field-sizing-content text-pink-500 tabular-nums placeholder:text-gray-400`}
        data-empty={valueEmpty || undefined}
        placeholder="0"
        type="text"
        pattern="-?[0-9]*\.?[0-9]*"
        inputMode="decimal"
        value={token.value.value}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, (token) => {
            token.value.value = e.target.value;
          })
        }
      />

      <button
        ref={mergedRefs}
        {...getReferenceProps()}
        data-open={isOpen || undefined}
        className={`cursor-pointer focus:bg-gray-100 focus:outline-none data-[open]:bg-gray-100 data-[open]:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-r-md field-sizing-content text-pink-500 ${
          invalid ? "text-red-600" : ""
        }`}
      >
        {token.value.unit || ""}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white rounded-md shadow-lg max-w-72 empty:hidden overflow-y-auto relative"
          >
            <div className="p-2 sticky top-0 bg-white border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1 focus:outline-none text-sm"
                placeholder="Search..."
                autoFocus
              />
            </div>

            {Object.entries(groupedUnits).map(
              ([group, unuts]) =>
                unuts.length > 0 && (
                  <Fragment key={group}>
                    <div className="text-xs font-semibold text-gray-500 px-3 py-3 pb-1 truncate">
                      {group}
                    </div>
                    {unuts.map((unit) => (
                      <button
                        key={unit.value}
                        {...getItemProps({
                          ref: (node) => (listRef.current[unit.index] = node),
                          onClick: () => handleSelect(unit.value),
                        })}
                        className={`text-sm w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b ${
                          activeIndex === unit.index ? "bg-gray-100" : ""
                        }`}
                      >
                        {unit.value}
                        <div className="text-gray-500 text-xs whitespace-nowrap pl-2 ml-auto truncate min-w-0">
                          {unit.name}
                        </div>
                      </button>
                    ))}
                  </Fragment>
                ),
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
});

export default QuantityToken;
