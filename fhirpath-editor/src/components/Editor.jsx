import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
import { canMoveBinding, generateBindingId } from "../utils/expression";
import SortableBinding from "./SortableBinding";
import DragHandle from "./DragHandle";
import appToFhirPath from "../utils/fhir";
import { useOnMount } from "../utils/react";

function Editor({ value, setValue, globalBindings }) {
  const lastInputRef = React.useRef(null);
  const [activeId, setActiveId] = React.useState(null);
  const [overItemId, setOverItemId] = React.useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addBinding = () => {
    setValue({
      ...value,
      bindings: [
        ...value.bindings,
        {
          name: `var${value.bindings.length + 1}`,
          expression: [],
          id: `binding-${Date.now()}`,
        },
      ],
    });
    setTimeout(() => lastInputRef.current?.focus(), 0);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    setOverItemId(event.over?.id || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.bindings.findIndex(
        (item) => item.id === active.id,
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
      return;
    }

    const renamed = binding.name !== value.bindings[index].name;

    if (renamed && globalBindings.some((gb) => gb.name === binding.name)) {
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
                : token,
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
    <div className="p-8 flex flex-col gap-2 min-h-screen">
      <h2 className="text-lg font-semibold mt-2">Bindings</h2>

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
          <div className="flex flex-col gap-2">
            {value.bindings.map((binding, index) => (
              <SortableBinding
                ref={index === value.bindings.length - 1 ? lastInputRef : null}
                sorting={binding.id === activeId}
                key={binding.id || index}
                value={binding}
                onChange={(value) => handleBindingChange(index, value)}
                bindings={[
                  ...globalBindings,
                  ...value.bindings.slice(0, index),
                ]}
              />
            ))}
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
                  (b) => b.id === activeId,
                );
                const draggedBinding = value.bindings.find(
                  (b) => b.id === activeId,
                );

                const overIndex = overItemId
                  ? value.bindings.findIndex((b) => b.id === overItemId)
                  : -1;

                const isValidMove =
                  overIndex === -1 ||
                  canMoveBinding(value.bindings, draggedIndex, overIndex);

                return (
                  <div className="opacity-80 *:bg-white flex flex-row gap-2 items-center">
                    <DragHandle valid={isValidMove} active={true} />
                    <Binding
                      value={draggedBinding}
                      onChange={() => {}}
                      bindings={[
                        ...globalBindings,
                        ...value.bindings.slice(0, draggedIndex),
                      ]}
                    />
                  </div>
                );
              })()
            : null}
        </DragOverlay>
      </DndContext>

      <button
        className="bg-blue-500 text-white p-2 rounded-md w-32 mt-2"
        onClick={addBinding}
      >
        Add Binding
      </button>

      <h2 className="text-lg font-semibold mt-2">Primary Expression</h2>
      <div className="flex flex-row gap-2 items-center">
        <Binding
          value={{ name: null, expression: value.expression }}
          onChange={({ expression }) => setValue({ ...value, expression })}
          bindings={[...globalBindings, ...value.bindings]}
        />
      </div>

      <h2 className="text-lg font-semibold mt-2">Compiled FHIRPath</h2>
      <pre className="text-xs bg-gray-50 p-4 rounded-md border border-gray-200 w-fit">
        {appToFhirPath(value)}
      </pre>

      <details className="mt-auto">
        <summary className="text-sm font-semibold text-gray-500">Debug</summary>
        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-md border border-gray-200">
          {JSON.stringify(value.bindings, null, 2)}
        </pre>
        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-md border border-gray-200">
          {JSON.stringify(value.expression, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default Editor;
