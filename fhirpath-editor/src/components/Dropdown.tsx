import React, { Fragment, useRef, useState } from "react";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingOverlay,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from "@floating-ui/react";
import { Empty } from "@phosphor-icons/react";

function Dropdown<T>({
  items,
  searchFn,
  groupFn,
  keyFn,
  createFn,
  onClick,
  renderReference,
  renderItem,
}: {
  items: T[];
  searchFn?: (item: T, searchText: string) => boolean;
  groupFn?: (item: T) => string;
  keyFn?: (item: T) => string | number;
  createFn?: (searchText: string) => T | undefined;
  onClick: (item: T, created: boolean) => void;
  renderReference: (
    props: (userProps?: React.HTMLProps<Element>) => Record<string, unknown>,
    ref: React.Ref<HTMLButtonElement>,
  ) => React.ReactNode;
  renderItem?: (item: T, created: boolean) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLButtonElement | null>>([]);
  const arrowRef = useRef(null);

  const filteredItems =
    searchFn && searchText
      ? items.filter((item) => searchFn(item, searchText))
      : items;

  const createdItem =
    !filteredItems.length && !!searchText && createFn?.(searchText);

  const inc = createdItem ? 1 : 0;

  const groupedOptions = groupFn
    ? filteredItems.reduce(
        (acc, item, index) => {
          const group = groupFn(item);
          if (!acc[group]) {
            acc[group] = [];
          }
          acc[group].push({ item, index: inc + index });
          return acc;
        },
        {} as Record<string, { item: T; index: number }[]>,
      )
    : {
        "": filteredItems.map((item, index) => ({
          item,
          index: inc + index,
        })),
      };

  const { refs, floatingStyles, context } = useFloating({
    placement: "right",
    strategy: "absolute",
    whileElementsMounted: autoUpdate,
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) {
        setSearchText("");
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
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, listNavigation],
  );

  const reference = renderReference(
    (props) =>
      getReferenceProps({
        ...props,
        "data-open": isOpen || undefined,
      } as React.HTMLProps<Element>),
    refs.setReference,
  );

  const handleSelect = (item: T, created: boolean) => {
    setIsOpen(false);
    setSearchText("");
    onClick(item, created);
  };

  const optionClass =
    "focus:outline-none w-full px-3 py-2 text-left grid grid-cols-[1rem_1fr_auto] items-center gap-2 cursor-pointer last:rounded-b data-[active]:bg-gray-100";

  return (
    <>
      {reference}
      {isOpen && (
        <FloatingPortal>
          <FloatingOverlay className="bg-black/30" lockScroll />
          <div style={floatingStyles}>
            <FloatingArrow
              ref={arrowRef}
              context={context}
              fill="white"
              height={5}
              width={10}
            />
          </div>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white rounded-md shadow-lg min-w-72 max-w-92 empty:hidden overflow-y-auto relative"
            {...getFloatingProps()}
          >
            {searchFn && (
              <div className="p-2 sticky top-0 bg-white border-b border-gray-200">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-2 py-1 focus:outline-none"
                  placeholder="Search..."
                  autoFocus
                />
              </div>
            )}

            {createdItem && (
              <button
                ref={(node) => {
                  listRef.current[0] = node;
                }}
                className={optionClass}
                data-active={activeIndex === 0 || undefined}
                {...getItemProps({
                  onClick: () => handleSelect(createdItem, true),
                })}
              >
                {renderItem ? renderItem(createdItem, true) : createdItem + ""}
              </button>
            )}

            {Object.entries(groupedOptions).map(
              ([group, items]) =>
                items.length > 0 && (
                  <Fragment key={group}>
                    {group && (
                      <div className="text-sm font-semibold text-gray-500 px-3 py-3 pb-1 truncate sticky top-[calc(3rem_+_1px)] bg-white">
                        {group}
                      </div>
                    )}
                    {items.map(({ item, index }) => (
                      <button
                        key={keyFn ? keyFn(item) : index}
                        ref={(node) => {
                          listRef.current[index] = node;
                        }}
                        className={optionClass}
                        tabIndex={activeIndex === index ? 0 : -1}
                        data-active={activeIndex === index || undefined}
                        {...getItemProps({
                          onClick: () => handleSelect(item, false),
                        })}
                      >
                        {renderItem ? renderItem(item, false) : item + ""}
                      </button>
                    ))}
                  </Fragment>
                ),
            )}

            {!createdItem && filteredItems.length === 0 && (
              <div className="text-gray-500 flex items-center gap-1 whitespace-nowrap px-3 py-3">
                <Empty size={16} /> Nothing found
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default Dropdown;
