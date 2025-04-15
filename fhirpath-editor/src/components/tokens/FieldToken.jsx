import React, { Fragment, useRef, useState } from "react";
import { getFields } from "@utils/fhir";
import { useProgramContext } from "@utils/store.jsx";
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
import { Shapes } from "@phosphor-icons/react";

import { stringifyType } from "@utils/stringify.js";

const FieldToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken, getFhirSchema } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
    getFhirSchema: state.getFhirSchema,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const fields = getFields(precedingExpressionType, getFhirSchema());
  const invalid = fields[token.value] === undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const listRef = useRef([]);
  const debug = useDebug();

  const filteredFields = Object.entries(fields).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase()),
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
        {tokenIndex > 0 ? "." : ""}
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

            {filteredFields.map(([name, type], index) => (
              <button
                key={name}
                {...getItemProps({
                  ref: (node) => (listRef.current[index] = node),
                  onClick: () => handleSelect(name),
                })}
                className={`text-sm w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b ${
                  activeIndex === index ? "bg-gray-100" : ""
                }`}
              >
                <Shapes size={16} className="text-gray-500" />
                {name}
                {debug && (
                  <span className="text-gray-500 inline-flex items-center gap-1 text-xs whitespace-nowrap pl-2 ml-auto">
                    {stringifyType(type)}
                  </span>
                )}
              </button>
            ))}

            {filteredFields.length === 0 && (
              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3">
                No fields found
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default FieldToken;
