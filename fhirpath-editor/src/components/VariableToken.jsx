import React, { Fragment, useRef, useState } from "react";
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

import { useProgramContext } from "@utils/store.js";
import { useDebug } from "@utils/react.js";
import { stringifyType } from "@utils/stringify.js";
import { Plus, PuzzlePiece } from "@phosphor-icons/react";

const VariableToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const listRef = useRef([]);
  const debug = useDebug();

  const {
    bindingIndex,
    token,
    updateToken,
    isBindingNameUnique,
    addBinding,
    getBindingExpressionType,
  } = useProgramContext((state) => ({
    bindingIndex: state.bindingsIndex[bindingId],
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
    addBinding: state.addBinding,
    isBindingNameUnique: state.isBindingNameUnique,
    getBindingExpressionType: state.getBindingExpressionType,
  }));

  const compatibleBindings = useProgramContext((state) =>
    state.getCompatibleBindings(bindingId, tokenIndex),
  );

  const filteredBindings = compatibleBindings.filter(({ name }) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const invalid = !compatibleBindings.find(({ name }) => name === token.value);
  const canCreateNewVariable = search && isBindingNameUnique(search, bindingId);

  const groupedBindings = filteredBindings.reduce(
    (acc, binding, index) => {
      acc[binding.expression?.length ? "Local" : "Global"].push({
        ...binding,
        index,
      });
      return acc;
    },
    { Local: [], Global: [] },
  );

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

  const handleCreate = () => {
    addBinding({ name: search }, bindingIndex, false);
    handleSelect(search);
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
        {token.value}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white rounded-md shadow-lg min-w-60 empty:hidden overflow-y-auto relative"
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

            {canCreateNewVariable && (
              <button
                {...getItemProps({
                  ref: (node) => (listRef.current[0] = node),
                  onClick: handleCreate,
                })}
                className={`text-sm w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 ${
                  activeIndex === 0 ? "bg-gray-100" : ""
                }`}
              >
                <Plus size={16} className="text-gray-500" />
                New named expression
              </button>
            )}

            {Object.entries(groupedBindings).map(
              ([group, bindings]) =>
                bindings.length > 0 && (
                  <Fragment key={group}>
                    <div className="text-xs font-semibold text-gray-500 px-3 py-3 pb-1">
                      {group}
                    </div>
                    {bindings.map((binding) => (
                      <button
                        key={binding.id || binding.name}
                        {...getItemProps({
                          ref: (node) =>
                            (listRef.current[binding.index + 1] = node),
                          onClick: () => handleSelect(binding.name),
                        })}
                        className={`text-sm w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b ${
                          activeIndex === binding.index + 1 ? "bg-gray-100" : ""
                        }`}
                      >
                        <PuzzlePiece size={16} className="text-gray-500" />
                        {binding.name}
                        {debug && (
                          <span className="text-gray-500 inline-flex items-center gap-1 text-xs whitespace-nowrap pl-2 ml-auto">
                            {stringifyType(
                              getBindingExpressionType(binding.id),
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </Fragment>
                ),
            )}

            {!canCreateNewVariable && filteredBindings.length === 0 && (
              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3">
                No named expressions found
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default VariableToken;
