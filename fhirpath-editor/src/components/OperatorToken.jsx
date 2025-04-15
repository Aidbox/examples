import React, { createElement, Fragment, useRef, useState } from "react";

import { useProgramContext } from "@utils/store.js";
import {
  operatorGroups,
  operatorNames,
  suggestOperatorsForLeftType,
} from "@utils/operator.js";
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
import { distinct } from "@utils/misc.js";
import OperatorIcon from "@components/OperatorIcon.jsx";

const OperatorToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const compatibleOperators = distinct(
    suggestOperatorsForLeftType(precedingExpressionType).map(
      (meta) => meta.name,
    ),
  );

  const invalid = !compatibleOperators.find((name) => name === token.value);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const listRef = useRef([]);

  const filteredOperators = compatibleOperators.filter(
    (name) =>
      operatorNames[name].toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedOperators = filteredOperators.reduce((acc, name, index) => {
    const group = Object.keys(operatorGroups).find((groupName) =>
      operatorGroups[groupName].includes(name),
    );

    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push({ name, index });
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

  const handleSelect = (value) => {
    updateToken(bindingId, tokenIndex, { value });
    setIsOpen(false);
    setSearch("");
  };

  const mergedRefs = useMergeRefs([ref, refs.setReference]);

  return (
    <>
      <button
        ref={mergedRefs}
        {...getReferenceProps()}
        data-open={isOpen || undefined}
        className={`cursor-pointer focus:bg-gray-100 focus:outline-none data-[open]:bg-gray-100 data-[open]:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-green-800 ${
          invalid ? "text-red-600" : ""
        }`}
      >
        <OperatorIcon name={token.value} compact={false} />
      </button>

      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white rounded-md shadow-lg min-w-60 empty:hidden overflow-y-auto relative grid grid-cols-[auto_1fr] items-center"
          >
            <div className="p-2 sticky top-0 bg-white border-b border-gray-200 col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1 focus:outline-none text-sm"
                placeholder="Search..."
                autoFocus
              />
            </div>

            {Object.entries(groupedOperators).map(
              ([group, operators]) =>
                operators.length > 0 && (
                  <Fragment key={group}>
                    <div className="text-xs font-semibold text-gray-500 px-3 py-3 pb-1 col-span-2">
                      {group}
                    </div>
                    {operators.map((operator) => (
                      <button
                        key={operator.name}
                        {...getItemProps({
                          ref: (node) =>
                            (listRef.current[operator.index + 1] = node),
                          onClick: () => handleSelect(operator.name),
                        })}
                        className={`text-sm col-span-2 grid grid-cols-subgrid w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b ${
                          activeIndex === operator.index + 1
                            ? "bg-gray-100"
                            : ""
                        }`}
                      >
                        <OperatorIcon name={operator.name} />
                        <span>{operatorNames[operator.name]}</span>
                      </button>
                    ))}
                  </Fragment>
                ),
            )}

            {!filteredOperators.length && (
              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3 col-span-2">
                No operators found
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default OperatorToken;
