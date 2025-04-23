import { forwardRef, Fragment, useRef, useState } from "react";
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
} from "../utils/function";
import {
  BracketsRound,
  CaretDown,
  Empty,
  Function,
} from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { isEmptyProgram } from "../utils/expression";
import {
  FunctionMetadata,
  IFunctionToken,
  TokenComponentProps,
} from "../types/internal";
import { assertDefined } from "../utils/misc";
import { Argument } from "./Argument";

const FunctionToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [_selectingName, setSelectingName] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const listRef = useRef<Array<HTMLButtonElement | null>>([]);
    const arrowRef = useRef(null);

    const { token, isLeadingToken, updateToken } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex) as IFunctionToken,
        isLeadingToken: state.isLeadingToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
      }),
    );

    const precedingExpressionType = useProgramContext((state) =>
      state.getExpressionType(bindingId, tokenIndex),
    );

    const meta = functionMetadata.find((f) => f.name === token.value);
    assertDefined(meta, `Function ${token.value} metadata not found`);

    const selectingName = _selectingName || !meta.args.length;

    const [selectedArgIndex, setSelectedArgIndex] = useState(
      meta.args.length &&
        (!meta.args[0].optional || !isEmptyProgram(token.args[0]))
        ? 0
        : null,
    );

    const suggestArgumentTypes = suggestArgumentTypesForFunction(
      meta.name,
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

    const { getReferenceProps, getFloatingProps, getItemProps } =
      useInteractions([click, dismiss, role, listNav]);

    const mergedRefs = useMergeRefs([ref, refs.setReference]);

    const filteredFunctions = functionMetadata.filter(
      (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
    );

    const groupedOptions = filteredFunctions.reduce(
      (acc, meta, index) => {
        const categoryName =
          Object.keys(category).find((categoryName) =>
            category[categoryName].includes(meta.name),
          ) || "Other";

        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        acc[categoryName].push({ meta, index });
        return acc;
      },
      {} as Record<string, { meta: FunctionMetadata; index: number }[]>,
    );

    function handleSelectName(meta: FunctionMetadata) {
      setSearch("");
      setSelectingName(false);
      if (meta.args.length) {
        setSelectedArgIndex(
          !meta.args[0].optional && !isEmptyProgram(token.args[0]) ? 0 : null,
        );
      } else {
        setIsOpen(false);
      }
      updateToken(bindingId, tokenIndex, {
        value: meta.name,
        args: [],
      });
    }

    return (
      <>
        <button
          ref={mergedRefs}
          {...getReferenceProps()}
          data-open={isOpen || undefined}
          className="cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600 flex items-center"
        >
          {isLeadingToken ? "" : "."}
          {token.value}
          <BracketsRound
            size={16}
            weight="bold"
            className="mt-[0.0825rem] ml-0.5"
          />
        </button>
        {isOpen && (
          <FloatingPortal>
            <div className="fixed inset-0 bg-black/30" />
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="bg-gray-50 rounded-md shadow-lg min-w-72 flex flex-col overflow-hidden"
              {...getFloatingProps()}
            >
              <FloatingArrow ref={arrowRef} context={context} fill="red" />
              <div className="flex items-center py-2 px-2 gap-2">
                {selectingName ? (
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-2 py-1 focus:outline-none"
                    placeholder="Search..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        activeIndex != null &&
                        filteredFunctions[activeIndex]
                      ) {
                        handleSelectName(filteredFunctions[activeIndex]);
                      }
                    }}
                  />
                ) : (
                  <>
                    <button
                      className="flex items-center justify-between gap-1 cursor-pointer rounded px-2 py-1 flex-1"
                      onClick={() => setSelectingName(true)}
                    >
                      {meta.name} <CaretDown />
                    </button>

                    {meta.args.length > 0 && (
                      <span className="text-gray-500 mt-0.5">Arguments</span>
                    )}

                    <div className="empty:hidden flex gap-[1px]">
                      {meta.args.map((arg, argIndex) => (
                        <button
                          key={argIndex}
                          className="relative cursor-pointer box-border first:rounded-l last:rounded-r px-2 py-1 data-[selected]:bg-gray-200 outline data-[optional]:outline-dashed outline-gray-300"
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
                {!selectingName &&
                  selectedArgIndex != null &&
                  meta.args[selectedArgIndex] !== undefined && (
                    <Argument
                      bindingId={bindingId}
                      tokenIndex={tokenIndex}
                      argIndex={selectedArgIndex}
                      suggestedType={suggestArgumentTypes[selectedArgIndex]}
                      contextValue={null} // todo: pass iteration element here
                    />
                  )}
                {selectingName &&
                  (filteredFunctions.length > 0 ? (
                    Object.entries(groupedOptions).map(([group, options]) => (
                      <Fragment key={group}>
                        <div className="text-sm font-semibold text-gray-500 px-3 py-3 pb-1 truncate sticky top-0 bg-white">
                          {group}
                        </div>
                        {options.map(({ meta, index }) => (
                          <button
                            key={meta.name}
                            ref={(node) => (listRef.current[index] = node)}
                            {...getItemProps({
                              className: `focus:outline-none w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer last:rounded-b-md ${
                                activeIndex === index ? "bg-gray-100" : ""
                              }`,
                              tabIndex: activeIndex === index ? 0 : -1,
                              onClick: () => handleSelectName(meta),
                            })}
                          >
                            <Function size={16} className="text-gray-500" />
                            {meta.name}
                          </button>
                        ))}
                      </Fragment>
                    ))
                  ) : (
                    <div className="text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3">
                      <Empty size={16} /> Nothing found
                    </div>
                  ))}
              </div>
            </div>
          </FloatingPortal>
        )}
      </>
    );
  },
);

export default FunctionToken;
