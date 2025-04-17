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
      className={`grid gap-x-1 w-full ${debug ? "grid-cols-[0.75rem_min-content_1rem_auto_auto_auto]" : "grid-cols-[0.75rem_min-content_1rem_auto_auto]"} ${className}`}
    >
      <div
        className={`font-medium text-gray-600 flex items-center gap-2 py-2 ${debug ? "col-span-6" : "col-span-5"}`}
      >
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
        <div
          key={bindingId}
          className={`grid grid-cols-subgrid items-center hover:bg-gray-50 py-1 pr-0.5 my-0.5 rounded ${debug ? "col-span-6" : "col-span-5"}`}
        >
          <BindingMenu bindingId={bindingId} />

          <Binding
            ref={(ref) => setBindingRef(bindingId, ref)}
            bindingId={bindingId}
          />
        </div>
      ))}

      {!bindingIds.length && (
        <>
          <span></span>
          <div
            className={`text-gray-500 border border-dashed border-gray-300 rounded-md h-11 flex items-center justify-center px-2 ${debug ? "col-span-6" : "col-span-5"}`}
          >
            Press the + button to add a named expression.
          </div>
        </>
      )}

      <div
        className={`font-medium text-gray-600 flex items-center gap-2 py-2 ${debug ? "col-span-5" : "col-span-6"}`}
      >
        {title || "Main Expression"}
      </div>

      {debug && (
        <div className="font-bold text-purple-600 truncate text-sm self-center">
          <span>{stringifyType(contextType)}</span>
        </div>
      )}

      <div
        className={`grid grid-cols-subgrid items-center ${debug ? "col-span-6" : "col-span-5"}`}
      >
        <span></span>
        <Binding ref={(ref) => setBindingRef(null, ref)} bindingId={null} />
      </div>
    </div>
  );
}

export default Editor;
