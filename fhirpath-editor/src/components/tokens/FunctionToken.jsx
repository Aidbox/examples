import React, { Fragment, useMemo, useRef, useState } from "react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
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
import {
  category,
  functionMetadata,
  suggestArgumentTypesForFunction,
} from "@utils/function";
import Editor from "@components/Editor";
import {
  BracketsRound,
  CaretDown,
  Empty,
  Function,
} from "@phosphor-icons/react";
import { ProgramProvider, useProgramContext } from "@utils/store.jsx";
import { isEmptyProgram } from "@utils/expression.js";
import { LambdaType } from "@utils/type.js";

const Argument = ({ bindingId, tokenIndex, argIndex, suggestedType }) => {
  const { arg, updateArg, contextType, getBindingExpressionType } =
    useProgramContext((state) => ({
      arg: state.getArg(bindingId, tokenIndex, argIndex),
      updateArg: state.updateArg,
      deleteArg: state.deleteArg,
      contextType: state.getContextType(),
      getBindingExpressionType: state.getBindingExpressionType,
    }));

  const precedingBindings = useProgramContext((state) =>
    state.getPrecedingBindings(bindingId),
  );

  const externalizedBindings = useMemo(
    () =>
      precedingBindings.map((binding) => ({
        id: binding.id,
        name: binding.name,
        type: getBindingExpressionType(binding.id),
      })),
    [precedingBindings, getBindingExpressionType],
  );

  return (
    <>
      <ProgramProvider
        program={arg}
        onProgramChange={(arg) =>
          updateArg(bindingId, tokenIndex, argIndex, arg)
        }
        contextType={
          suggestedType?.type === LambdaType.type
            ? suggestedType.contextType
            : contextType
        }
        externalBindings={externalizedBindings}
      >
        <Editor className="px-4 pt-3 pb-5" title="Argument expression" />
      </ProgramProvider>
    </>
  );
};

const FunctionToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectingName, setSelectingName] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const listRef = useRef([]);
  const arrowRef = useRef(null);

  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const precedingExpressionType = useProgramContext((state) =>
    state.getBindingExpressionType(bindingId, tokenIndex),
  );

  const meta = token.value
    ? functionMetadata.find((f) => f.name === token.value)
    : null;

  const [selectedArgIndex, setSelectedArgIndex] = useState(
    meta?.args.length &&
      (!meta.args[0].optional || !isEmptyProgram(token.args[0]))
      ? 0
      : null,
  );

  const suggestArgumentTypes = suggestArgumentTypesForFunction(
    meta?.name,
    precedingExpressionType,
    [],
  );

  const { refs, floatingStyles, context } = useFloating({
    placement: "right",
    strategy: "absolute",
    transform: false,
    whileElementsMounted: autoUpdate,
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) {
        setSearch("");
        setSelectingName(false);
      }
    },
    middleware: [
      arrow({
        element: arrowRef,
      }),
      offset({
        mainAxis: 6,
      }),
      shift(),
      flip(),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(0, availableHeight - 12)}px`,
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

  const invalid = false;
  const mergedRefs = useMergeRefs([ref, refs.setReference]);

  const filteredFunctions = functionMetadata.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedFunctions = filteredFunctions.reduce((acc, meta, index) => {
    const categoryName = Object.keys(category).find((categoryName) =>
      category[categoryName].includes(meta.name),
    );

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }

    acc[categoryName].push({ ...meta, index });
    return acc;
  }, {});

  function handleSelectName(name) {
    setSearch("");
    setSelectingName(false);
    const meta = functionMetadata.find((f) => f.name === name);
    setSelectedArgIndex(
      meta?.args.length &&
        !meta.args[0].optional &&
        !isEmptyProgram(token.args[0])
        ? 0
        : null,
    );
    updateToken(bindingId, tokenIndex, {
      value: name,
      args: [],
    });
  }

  return (
    <>
      <button
        ref={mergedRefs}
        {...getReferenceProps()}
        data-open={isOpen || undefined}
        className={`cursor-pointer flex items-center focus:bg-gray-100 focus:outline-none data-[open]:bg-gray-100 data-[open]:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-blue-800 ${
          invalid ? "text-red-600" : ""
        }`}
      >
        {tokenIndex > 0 ? "." : ""}
        {token.value}
        <BracketsRound
          size={16}
          className="mt-[0.0825rem] ml-0.5 text-gray-400"
          weight="bold"
        />
      </button>
      {isOpen && (
        <FloatingPortal>
          <div className="fixed inset-0 bg-black/30" />
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="rounded-md shadow-xl min-w-72 flex flex-col bg-gray-50 overflow-hidden"
            {...getFloatingProps()}
          >
            <FloatingArrow ref={arrowRef} context={context} fill="red" />
            <div className="flex items-center py-2 px-2 gap-2">
              {selectingName ? (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-2 py-1.5 focus:outline-none text-sm"
                  placeholder="Search..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      filteredFunctions[activeIndex] &&
                        handleSelectName(filteredFunctions[activeIndex].name);
                    }
                  }}
                />
              ) : (
                <>
                  <button
                    className="flex items-center justify-between gap-1 cursor-pointer hover:bg-gray-100 active:bg-gray-200 rounded px-2 py-1 flex-1"
                    onClick={() => setSelectingName(true)}
                  >
                    {meta.name} <CaretDown />
                  </button>

                  {meta.args.length > 0 && (
                    <span className="text-xs text-gray-500 mt-0.5">
                      Arguments
                    </span>
                  )}

                  <div className="empty:hidden flex gap-[1px]">
                    {meta.args.map((arg, argIndex) => (
                      <button
                        key={argIndex}
                        className="relative cursor-pointer box-border hover:bg-gray-100 active:bg-gray-200 first:rounded-l last:rounded-r px-2 py-1 data-[selected]:bg-gray-200 outline data-[optional]:outline-dashed outline-gray-300"
                        data-selected={
                          argIndex === selectedArgIndex || undefined
                        }
                        data-optional={arg.optional || undefined}
                        onClick={() => setSelectedArgIndex(argIndex)}
                      >
                        {meta.args[argIndex].name}
                        {argIndex === selectedArgIndex && (
                          <svg
                            viewBox="0 0 12 12"
                            width="12"
                            className="absolute left-1/2 -translate-x-1/2 pointer-events-auto top-full mt-[0.5px]"
                          >
                            <path
                              d="M1 8H11"
                              stroke="white"
                              strokeWidth="1px"
                            />

                            <path
                              d="M1 8L6 2L11 8"
                              stroke="currentColor"
                              strokeWidth="1px"
                              fill="white"
                              className="text-gray-200"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="overflow-auto flex-1 border-t border-gray-200 empty:hidden bg-white">
              {!selectingName && meta.args[selectedArgIndex] !== undefined && (
                <Argument
                  bindingId={bindingId}
                  tokenIndex={tokenIndex}
                  argIndex={selectedArgIndex}
                  suggestedType={suggestArgumentTypes[selectedArgIndex]}
                />
              )}
              {selectingName &&
                (filteredFunctions.length > 0 ? (
                  Object.entries(groupedFunctions).map(([group, functions]) => (
                    <Fragment key={group}>
                      <div className="text-xs font-semibold text-gray-500 px-3 py-3 pb-1">
                        {group}
                      </div>
                      {functions.map(({ name, index }) => (
                        <button
                          key={name}
                          {...getItemProps({
                            className: `text-sm focus:outline-none w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer active:bg-gray-200 last:rounded-b-md ${
                              activeIndex === index ? "bg-gray-100" : ""
                            }`,
                            tabIndex: activeIndex === index ? 0 : -1,
                            ref: (node) => (listRef.current[index] = node),
                            onClick: () => handleSelectName(name),
                          })}
                        >
                          <Function size={16} className="text-gray-500" />
                          {name}
                        </button>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3">
                    <Empty size={16} /> No matching functions found
                  </div>
                ))}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

export default FunctionToken;
