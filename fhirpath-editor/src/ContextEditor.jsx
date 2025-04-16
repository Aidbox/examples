import React, { useEffect, useState } from "react";
import { SingleType } from "@utils/type.js";
import { FhirType } from "@utils/fhir";
import { Plus, X } from "@phosphor-icons/react";
import { generateBindingId } from "@utils/expression.js";
import { stringifyType } from "@utils/stringify.js";
import { NullType } from "@utils/type";
import { JsonEditor } from "./JsonEditor.jsx";

function detectFhirType(value) {
  if (Array.isArray(value)) {
    if (value.length === 0 || !value[0].resourceType) {
      return NullType;
    }
    return FhirType([value[0].resourceType]);
  }

  if (!value || typeof value !== "object") {
    return NullType;
  }

  const resourceType = value.resourceType;
  if (!resourceType || typeof resourceType !== "string") {
    return FhirType(["Element"]);
  }

  return SingleType(FhirType([resourceType]));
}

export default function ContextEditor({
  context,
  setContext,
  externalBindings,
  setExternalBindings,
}) {
  const [activeTabId, setActiveTabId] = useState(null);
  const [editingBinding, setEditingBinding] = useState(null);

  useEffect(() => {
    if (externalBindings.length > 0 && !activeTabId) {
      setActiveTabId(null);
    }
    // If the active tab no longer exists, select the first one
    else if (
      activeTabId != null &&
      !externalBindings.find((b) => b.id === activeTabId)
    ) {
      setActiveTabId(null);
    }
  }, [externalBindings, activeTabId]);

  const addNewBinding = () => {
    const newBinding = {
      id: generateBindingId(),
      name: `external${externalBindings.length + 1}`,
      type: SingleType(FhirType(["Patient"])),
      value: {
        resourceType: "Patient",
      },
    };

    setExternalBindings([...externalBindings, newBinding]);
    setActiveTabId(newBinding.id);
  };

  const updateBindingValue = (id, newValue) => {
    setExternalBindings(
      externalBindings.map((binding) =>
        binding.id === id
          ? { ...binding, value: newValue, type: detectFhirType(newValue) }
          : binding,
      ),
    );
  };

  const updateContextValue = (newValue) => {
    setContext({ ...context, value: newValue, type: detectFhirType(newValue) });
  };

  const updateBindingName = (id, newName) => {
    if (externalBindings.some((b) => b.id !== id && b.name === newName)) {
      return;
    }

    setExternalBindings(
      externalBindings.map((binding) =>
        binding.id === id ? { ...binding, name: newName } : binding,
      ),
    );
  };

  const deleteBinding = (id) => {
    setExternalBindings(externalBindings.filter((b) => b.id !== id));
  };

  const activeBinding =
    activeTabId != null
      ? externalBindings.find((b) => b.id === activeTabId)
      : undefined;

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className="flex border-b border-gray-200">
        <div
          className={`text-xs cursor-pointer flex items-center border-t border-r border-gray-200 ${
            null === activeTabId ? "bg-gray-100" : "hover:bg-gray-50"
          }`}
          onClick={() => setActiveTabId(null)}
        >
          <span className="py-1.5 px-2 text-green-700">context</span>
        </div>

        {externalBindings.map((binding) => (
          <div
            key={binding.id}
            className={`text-xs cursor-pointer flex items-center border-t border-r border-gray-200 ${
              binding.id === activeTabId ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTabId(binding.id)}
            title={stringifyType(binding.type)}
          >
            {editingBinding === binding.id ? (
              <input
                type="text"
                value={binding.name}
                onChange={(e) => updateBindingName(binding.id, e.target.value)}
                onBlur={() => setEditingBinding(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingBinding(null);
                  }
                }}
                ref={(ref) => {
                  if (ref) {
                    // if not focused, focus and select the input
                    if (!ref.matches(":focus")) {
                      ref.focus();
                      ref.setSelectionRange(0, ref.value.length);
                    }
                  }
                }}
                className="pl-2 py-1.5 focus:outline-none field-sizing-content"
              />
            ) : (
              <span
                className="truncate max-w-52 py-1.5 pl-2"
                onDoubleClick={() => setEditingBinding(binding.id)}
              >
                {binding.name}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this binding?")) {
                  deleteBinding(binding.id);
                }
              }}
              className="text-gray-400 hover:text-gray-700 cursor-pointer px-1 py-1"
              title="Delete binding"
            >
              <X size={14} weight="light" />
            </button>
          </div>
        ))}
        <button
          className="px-2 text-gray-400 hover:text-gray-700 cursor-pointer active:bg-gray-100 border-t border-r border-transparent active:border-gray-200"
          onClick={addNewBinding}
          title="Add new binding"
        >
          <Plus size={14} />
        </button>
      </div>

      <JsonEditor
        key={activeBinding?.id || "context"}
        value={activeBinding?.value || context.value}
        onChange={(newValue) => {
          if (activeBinding != null) {
            updateBindingValue(activeBinding.id, newValue);
          } else {
            updateContextValue(newValue);
          }
        }}
      />
    </div>
  );
}
