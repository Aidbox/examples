import React, { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import BindingMenu from "./BindingMenu.jsx";
import Binding from "./Binding";

const SortableBinding = forwardRef(
  ({ value, bindings, onChange, sorting, onDuplicate }, forwardingRef) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: value.id,
    });

    const style = {
      transform: transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
      transition,
      zIndex: isDragging ? 999 : undefined,
      opacity: isDragging ? 0.4 : undefined,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="grid grid-cols-subgrid col-span-4 relative items-center"
      >
        {!sorting && (
          <BindingMenu
            attributes={attributes}
            listeners={listeners}
            onDelete={() => onChange(null)}
            onDuplicate={onDuplicate}
          />
        )}
        <Binding
          ref={forwardingRef}
          value={value}
          onChange={onChange}
          bindings={bindings}
        />
      </div>
    );
  },
);

export default SortableBinding;
