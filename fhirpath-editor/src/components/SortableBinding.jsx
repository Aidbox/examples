import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import DragHandle from "./DragHandle";
import Binding from "./Binding";

const SortableBinding = ({ value, bindings, onChange }) => {
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
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DragHandle attributes={attributes} listeners={listeners} />
      <Binding value={value} onChange={onChange} bindings={bindings} />
    </div>
  );
};

export default SortableBinding;
