import { ReactNode } from "react";
import Binding from "./Binding";
import BindingMenu from "./BindingMenu";
import { Plus } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { stringifyType } from "../utils/type";
import clx from "classnames";
import { useStyle } from "../style";

type ProgramProps = {
  className?: string;
  title?: ReactNode;
};

function Program({ className = "", title = "Main Expression" }: ProgramProps) {
  const style = useStyle();
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
      className={clx(
        style.program.container,
        debug && style.program.extended,
        className,
      )}
    >
      <div className={style.program.title}>Named Expressions</div>

      {bindingIds.map((bindingId) => (
        <div key={bindingId} className={style.program.binding}>
          <BindingMenu bindingId={bindingId} />

          <Binding
            ref={(ref) => setBindingRef(bindingId, ref)}
            bindingId={bindingId}
          />
        </div>
      ))}

      <div className={style.program.define}>
        <button
          className={style.binding.cursor.button}
          onClick={() => addBinding({ name: "var1" })}
        >
          <Plus size={12} />
        </button>
      </div>

      <div className={style.program.title}>{title}</div>

      {debug && (
        <div className={style.binding.debug}>
          <span>{stringifyType(context.type)}</span>
        </div>
      )}

      <div className={style.program.binding}>
        <BindingMenu bindingId="" />
        <Binding ref={(ref) => setBindingRef("", ref)} bindingId={""} />
      </div>
    </div>
  );
}

export default Program;
