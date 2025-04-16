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

      <div className="grid grid-cols-[auto_auto_1fr] gap-2 w-fit pl-6">
        {bindingIds.map((bindingId) => (
          <>
            <div className="grid grid-cols-subgrid col-span-4 relative items-center">
              <BindingMenu bindingId={bindingId} />
              <Binding bindingId={bindingId} />
            </div>
          </>
        ))}
        {!bindingIds.length && (
          <div className="text-gray-500 text-sm border border-dashed border-gray-300 rounded-md h-11 flex items-center justify-center px-2">
            Press the + button to add a named expression.
          </div>
        )}
      </div>

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
