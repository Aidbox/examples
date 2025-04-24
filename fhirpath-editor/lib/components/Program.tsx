import { ReactNode } from "react";
import Binding from "./Binding";
import BindingMenu from "./BindingMenu";
import { Plus } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { stringifyType } from "../utils/type";

type ProgramProps = {
  className?: string;
  title?: ReactNode;
};

function Program({ className = "", title = "Main Expression" }: ProgramProps) {
  const { addBinding, setBindingRef, debug } = useProgramContext((state) => ({
    addBinding: state.addBinding,
    setBindingRef: state.setBindingRef,
    debug: state.getDebug(),
  }));

  const bindingIds = useProgramContext((state) =>
    state.program.bindings.map((b) => b.id),
  );

  const context = useProgramContext((state) => state.getContext());

  return (
    <div
      className={`grid gap-x-1 w-full ${debug ? "grid-cols-[1.25rem_minmax(0,_min-content)_1rem_auto_auto_auto]" : "grid-cols-[1.25rem_minmax(0,_min-content)_1rem_auto_auto]"} ${className}`}
    >
      <div
        className={`font-medium text-gray-600 flex items-center gap-2 py-2 ${debug ? "col-span-6" : "col-span-5"}`}
      >
        Named Expressions
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

      <div
        className={`flex items-center min-h-8 col-start-2 ${debug ? "col-span-6" : "col-span-5"}`}
      >
        <button
          className="text-gray-600 cursor-pointer py-0.5 px-0.5 grid place-items-center rounded border border-gray-300 bg-white"
          onClick={() => addBinding({ name: "var1" })}
        >
          <Plus size={12} />
        </button>
      </div>

      <div
        className={`font-medium text-gray-600 flex items-center gap-2 py-2 ${debug ? "col-span-5" : "col-span-4"}`}
      >
        {title}
      </div>

      {debug && (
        <div className="text-purple-600 truncate text-sm self-center">
          <span>{stringifyType(context.type)}</span>
        </div>
      )}

      <div
        className={`grid grid-cols-subgrid items-center h-8 ${debug ? "col-span-6" : "col-span-5"}`}
      >
        <BindingMenu bindingId="" />
        <Binding ref={(ref) => setBindingRef("", ref)} bindingId={""} />
      </div>
    </div>
  );
}

export default Program;
