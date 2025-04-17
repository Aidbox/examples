import React from "react";
import Binding from "./Binding";
import BindingMenu from "./BindingMenu.jsx";
import { useDebug } from "@utils/react";
import { Plus } from "@phosphor-icons/react";
import { stringifyType } from "@utils/stringify.js";
import { useProgramContext } from "@utils/store.js";

function Editor({ className = "", title }) {
  const debug = useDebug();

  const { addBinding, setBindingRef } = useProgramContext((state) => ({
    addBinding: state.addBinding,
    setBindingRef: state.setBindingRef,
  }));

  const bindingIds = useProgramContext((state) =>
    state.program.bindings.map((b) => b.id),
  );

  const contextType = useProgramContext((state) => state.getContextType());

  return (
    <div
      className={`grid grid-cols-[min-content_min-content_min-content_auto_auto] gap-x-1 w-full ${className}`}
    >
      <div className="col-span-5 font-medium text-gray-600 flex items-center gap-2 py-2">
        Named Expressions
        <button
          className="cursor-pointer rounded-full p-0.5 border"
          onClick={() => addBinding({ name: "var1" })}
          aria-label="add binding"
        >
          <Plus size={10} weight="bold" />
        </button>
      </div>

      {bindingIds.map((bindingId) => (
        <Binding
          key={bindingId}
          ref={(ref) => setBindingRef(bindingId, ref)}
          bindingId={bindingId}
        />
      ))}

      {!bindingIds.length && (
        <div className="col-span-5 text-gray-500 border border-dashed border-gray-300 rounded-md h-11 flex items-center justify-center px-2">
          Press the + button to add a named expression.
        </div>
      )}

      <div className="col-span-5 font-medium text-gray-600 flex items-center gap-2 py-2">
        {title || "Main Expression"}

        {debug && (
          <div className="font-normal text-purple-600 truncate text-sm ml-auto">
            <span>Context type: {stringifyType(contextType)}</span>
          </div>
        )}
      </div>

      <Binding ref={(ref) => setBindingRef(null, ref)} bindingId={null} />
    </div>
  );
}

export default Editor;
