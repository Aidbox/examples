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
import { canMoveBinding, generateBindingId } from "@utils/expression";
import SortableBinding from "./SortableBinding";
import BindingMenu from "./BindingMenu.jsx";
import { ContextTypeProvider, useDebug, useOnMount } from "@utils/react";
import { Plus } from "@phosphor-icons/react";
import { stringifyType } from "@utils/type.js";

function Editor({
  value,
  setValue,
  externalBindings,
  className = "",
  title,
  contextType,
}) {
  const debug = useDebug();
  const bindingRefs = React.useRef([]);
  const [activeId, setActiveId] = React.useState(null);
  const [overItemId, setOverItemId] = React.useState(null);
  const [lastInputWidth, setLastInputWidth] = React.useState("auto");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addBinding = (binding, afterIndex = value.bindings.length) => {
    setValue({
      ...value,
      bindings: [
        ...value.bindings.slice(0, afterIndex),
        {
          ...binding,
          expression: binding?.expression || [],
          name: `var${value.bindings.length + 1}`,
          id: `binding-${Date.now()}`,
        },
        ...value.bindings.slice(afterIndex),
      ],
    });
    setTimeout(() => bindingRefs.current[afterIndex]?.focus(), 0);
  };

  const handleDragStart = (event) => {
    setLastInputWidth(
      bindingRefs.current[value.bindings.length - 1]?.width || "auto"
    );
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    setOverItemId(event.over?.id || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.bindings.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = value.bindings.findIndex((item) => item.id === over.id);

      if (canMoveBinding(value.bindings, oldIndex, newIndex)) {
        const newBindings = [...value.bindings];
        const [movedItem] = newBindings.splice(oldIndex, 1);
        newBindings.splice(newIndex, 0, movedItem);
        setValue({ ...value, bindings: newBindings });
      }
    }

    setActiveId(null);
    setOverItemId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverItemId(null);
  };

  // Handle case where bindings don't have IDs (first load)
  useOnMount(() => {
    if (value.bindings.some((binding) => !binding.id)) {
      setValue({
        ...value,
        bindings: value.bindings.map((binding) => ({
          ...binding,
          id: generateBindingId(),
        })),
      });
    }
  });

  const handleBindingChange = (index, binding) => {
    if (binding === null) {
      setValue({
        ...value,
        bindings: [
          ...value.bindings.slice(0, index),
          ...value.bindings.slice(index + 1),
        ],
      });
      setTimeout(
        () =>
          (
            bindingRefs.current[index - 1] || bindingRefs.current[index]
          )?.focus(),
        0
      );
      return;
    }

    const renamed = binding.name !== value.bindings[index].name;

    if (renamed && externalBindings.some((gb) => gb.name === binding.name)) {
      return;
    }

    if (renamed && value.bindings.some((b) => b.name === binding.name)) {
      return;
    }

    const newBindings = [...value.bindings];
    newBindings[index] = binding;

    if (renamed) {
      newBindings.forEach((b, i) => {
        if (i !== index) {
          newBindings[i] = {
            ...b,
            expression: b.expression.map((token) =>
              token.type === "variable" &&
              token.value === value.bindings[index].name
                ? { ...token, value: binding.name }
                : token
            ),
          };
        }
      });
    }

    setValue({
      ...value,
      bindings: newBindings,
    });
  };

  return (
    <ContextTypeProvider value={contextType}>
      <div className={`flex flex-col gap-2 w-fit ${className}`}>
        <div className="font-medium text-gray-600 text-sm flex items-center gap-2">
          Named Expressions
          <button
            className="cursor-pointer rounded-full p-0.5 border hover:text-blue-500 active:text-white active:bg-blue-500 active:border-blue-500"
            onClick={() => addBinding()}
            aria-label="add binding"
          >
            <Plus size={10} weight="bold" />
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={value.bindings.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-[auto_auto_1fr] gap-2 w-fit pl-6">
              {value.bindings.map((binding, index) => (
                <SortableBinding
                  ref={(ref) => (bindingRefs.current[index] = ref)}
                  sorting={binding.id === activeId}
                  key={binding.id || index}
                  value={binding}
                  onChange={(value) => handleBindingChange(index, value)}
                  onDuplicate={() => addBinding(binding, index + 1)}
                  bindings={[
                    ...externalBindings,
                    ...value.bindings.slice(0, index),
                  ]}
                />
              ))}
              {!value.bindings?.length && (
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
            {activeId
              ? (() => {
                  const draggedIndex = value.bindings.findIndex(
                    (b) => b.id === activeId
                  );
                  const draggedBinding = value.bindings.find(
                    (b) => b.id === activeId
                  );

                  const overIndex = overItemId
                    ? value.bindings.findIndex((b) => b.id === overItemId)
                    : -1;

                  const isValidMove =
                    overIndex === -1 ||
                    canMoveBinding(value.bindings, draggedIndex, overIndex);

                  return (
                    <div
                      className="grid opacity-80 *:bg-white flex flex-row gap-2 relative items-center"
                      style={{
                        gridTemplateColumns: `${lastInputWidth} auto 1fr`,
                      }}
                    >
                      <BindingMenu valid={isValidMove} active={true} />
                      <Binding
                        value={draggedBinding}
                        bindings={[
                          ...externalBindings,
                          ...value.bindings.slice(0, draggedIndex),
                        ]}
                      />
                    </div>
                  );
                })()
              : null}
          </DragOverlay>
        </DndContext>

        <div className="font-medium text-gray-600 text-sm">
          {title || "Main Expression"}
        </div>
        <div className="flex flex-row gap-2 items-center pl-6">
          <Binding
            value={{ name: null, expression: value.expression }}
            onChange={({ expression }) => setValue({ ...value, expression })}
            bindings={[...externalBindings, ...value.bindings]}
          />
        </div>

        {debug && (
          <div className="text-gray-500 flex flex-col gap-1 text-xs whitespace-nowrap">
            <span>Context type: {stringifyType(contextType)}</span>
          </div>
        )}
      </div>
    </ContextTypeProvider>
  );
}

export default Editor;
