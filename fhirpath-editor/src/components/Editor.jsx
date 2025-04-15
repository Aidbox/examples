import React from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import Binding from "./Binding";
import SortableBinding from "./SortableBinding";
import BindingMenu from "./BindingMenu.jsx";
import { useDebug } from "@utils/react";
import { Plus } from "@phosphor-icons/react";
import { stringifyType } from "@utils/stringify.js";
import { useProgramContext } from "@utils/store.jsx";

function Editor({ className = "", title }) {
  const debug = useDebug();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    addBinding,
    handleBindingDragEnd,
    handleBindingDragStart,
    handleBindingDragOver,
    handleBindingDragCancel,
    isValidBindingDrag,
    isBindingDraggingUp,
    draggingBindingId,
    bindingNameWidth,
    setBindingRef,
  } = useProgramContext((state) => ({
    addBinding: state.addBinding,
    handleBindingDragEnd: state.handleBindingDragEnd,
    handleBindingDragStart: state.handleBindingDragStart,
    handleBindingDragOver: state.handleBindingDragOver,
    handleBindingDragCancel: state.handleBindingDragCancel,
    isValidBindingDrag: state.isValidBindingDrag,
    isBindingDraggingUp: state.isBindingDraggingUp,
    draggingBindingId: state.draggingBindingId,
    bindingNameWidth: state.bindingNameWidth,
    setBindingRef: state.setBindingRef,
  }));

  const bindingIds = useProgramContext((state) =>
    state.program.bindings.map((b) => b.id),
  );

  const contextType = useProgramContext((state) => state.getContextType());

  return (
    <div className={`flex flex-col gap-2 w-fit ${className}`}>
      <div className="font-medium text-gray-600 text-sm flex items-center gap-2">
        Named Expressions
        <button
          className="cursor-pointer rounded-full p-0.5 border hover:text-blue-500 active:text-white active:bg-blue-500 active:border-blue-500"
          onClick={() => addBinding({ name: "var1" })}
          aria-label="add binding"
        >
          <Plus size={10} weight="bold" />
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => handleBindingDragStart(event.active.id)}
        onDragOver={(event) => handleBindingDragOver(event.over?.id)}
        onDragEnd={() => handleBindingDragEnd()}
        onDragCancel={() => handleBindingDragCancel()}
      >
        <SortableContext
          items={bindingIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-[auto_auto_1fr] gap-2 w-fit pl-6">
            {bindingIds.map((bindingId) => (
              <SortableBinding
                ref={(ref) => setBindingRef(bindingId, ref)}
                bindingId={bindingId}
                key={bindingId}
              />
            ))}
            {!bindingIds.length && (
              <div className="text-gray-500 text-sm border border-dashed border-gray-300 rounded-md h-11 flex items-center justify-center px-2">
                Press the + button to add a named expression.
              </div>
            )}
          </div>
        </SortableContext>

        <DragOverlay
          adjustScale={true}
          zIndex={1000}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        >
          {draggingBindingId && (
            <div
              className="grid opacity-80 *:bg-white flex flex-row gap-2 relative items-center"
              style={{
                gridTemplateColumns: `${bindingNameWidth} auto 1fr auto`,
              }}
            >
              <BindingMenu valid={isValidBindingDrag} dragging={true} />
              <Binding bindingId={draggingBindingId} shadow />
              {!isValidBindingDrag && (
                <div className="text-red-500 text-xs whitespace-nowrap">
                  {isBindingDraggingUp
                    ? "This expression refers to at least one of the expressions above"
                    : "This expression is referenced by at least one of the expressions below"}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="font-medium text-gray-600 text-sm">
        {title || "Main Expression"}
      </div>
      <div className=" pl-6">
        <div className="relative flex flex-row gap-2 items-center">
          <BindingMenu bindingId={null} />
          <Binding ref={(ref) => setBindingRef(null, ref)} bindingId={null} />
        </div>
      </div>

      {debug && (
        <div className="text-gray-500 flex flex-col gap-1 text-xs whitespace-nowrap">
          <span>Context type: {stringifyType(contextType)}</span>
        </div>
      )}
    </div>
  );
}

export default Editor;
