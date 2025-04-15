import React, { Fragment, useRef, useState } from "react";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  StringType,
  TimeType,
} from "@utils/type";
import { FhirType, primitiveTypeMap } from "@utils/fhir";
import { useProgramContext } from "@utils/store.jsx";
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
import { stringifyTypeToken } from "@utils/stringify.js";

const typesGroups = {
  "Literal Types": [
    IntegerType,
    DecimalType,
    StringType,
    BooleanType,
    DateType,
    DateTimeType,
    TimeType,
  ],
  "FHIR Primitive Types": [...Object.values(primitiveTypeMap)],
  "FHIR Resource Types": [
    FhirType(["Patient"]),
    FhirType(["Questionnaire"]),
    FhirType(["Address"]),
  ],
};

const TypeToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const invalid = false;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const listRef = useRef([]);

  const filteredTypes = Object.entries(typesGroups)
    .flatMap(([, values]) => values)
    .filter((type) =>
      JSON.stringify(type).toLowerCase().includes(search.toLowerCase()),
    );

  const groupedOptions = filteredTypes.reduce((acc, type, index) => {
    const group = Object.keys(typesGroups).find((group) =>
      typesGroups[group].includes(type),
    );

    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push({ type, index });
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
        {stringifyTypeToken(token)}
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

            {Object.entries(groupedOptions).map(
              ([group, options]) =>
                options.length > 0 && (
                  <Fragment key={group}>
                    <div className="text-xs font-semibold text-gray-500 px-3 py-3 pb-1 col-span-2">
                      {group}
                    </div>
                    {options.map(({ type, index }) => (
                      <button
                        key={index}
                        {...getItemProps({
                          ref: (node) => (listRef.current[index] = node),
                          onClick: () => handleSelect(type),
                        })}
                        className={`text-sm col-span-2 grid grid-cols-subgrid w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b ${
                          activeIndex === index ? "bg-gray-100" : ""
                        }`}
                      >
                        {stringifyTypeToken({ type: "type", value: type })}
                      </button>
                    ))}
                  </Fragment>
                ),
            )}

            {!filteredTypes.length && (
              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3 col-span-2">
                No types found
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default TypeToken;
