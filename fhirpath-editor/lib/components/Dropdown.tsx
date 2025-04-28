import { Fragment, HTMLProps, ReactNode, Ref, useRef, useState } from "react";
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
import { useStyle } from "../style";
import { useText } from "../text";
import { useProgramContext } from "../utils/store.ts";

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
    props: (userProps?: HTMLProps<Element>) => Record<string, unknown>,
    ref: Ref<HTMLButtonElement>,
  ) => ReactNode;
  renderItem?: (item: T, created: boolean) => ReactNode;
}) {
  const style = useStyle();
  const text = useText();
  const portalRoot = useProgramContext((state) => state.getPortalRoot());
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
      } as HTMLProps<Element>),
    refs.setReference,
  );

  const handleSelect = (item: T, created: boolean) => {
    setIsOpen(false);
    setSearchText("");
    onClick(item, created);
  };

  return (
    <>
      {reference}
      {isOpen && (
        <FloatingPortal id={portalRoot}>
          <FloatingOverlay className={style.dropdown.backdrop} lockScroll />
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
            className={style.dropdown.container}
            {...getFloatingProps()}
          >
            {searchFn && (
              <div className={style.dropdown.search}>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={text.dropdown.search.placeholder}
                  autoFocus
                />
              </div>
            )}

            {createdItem && (
              <button
                ref={(node) => {
                  listRef.current[0] = node;
                }}
                className={style.dropdown.option}
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
                      <div className={style.dropdown.group}>{group}</div>
                    )}
                    {items.map(({ item, index }) => (
                      <button
                        key={keyFn ? keyFn(item) : index}
                        ref={(node) => {
                          listRef.current[index] = node;
                        }}
                        className={style.dropdown.option}
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
              <div className={style.dropdown.empty}>
                <Empty size={16} /> {text.dropdown.empty.nothingFound}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default Dropdown;
