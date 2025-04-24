import { ReactNode } from "react";
import Binding from "./Binding";
import BindingMenu from "./BindingMenu";
import { Plus } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { stringifyType } from "../utils/type";
import clx from "classnames";
import css from "./Program.module.css";
import cursorCss from "./Cursor.module.css";
import bindingCss from "./Binding.module.css";

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
    <div className={clx(css.container, debug && css.extended, className)}>
      <div className={css.title}>Named Expressions</div>

      {bindingIds.map((bindingId) => (
        <div key={bindingId} className={css.binding}>
          <BindingMenu bindingId={bindingId} />

          <Binding
            ref={(ref) => setBindingRef(bindingId, ref)}
            bindingId={bindingId}
          />
        </div>
      ))}

      <div className={css.define}>
        <button
          className={cursorCss.button}
          onClick={() => addBinding({ name: "var1" })}
        >
          <Plus size={12} />
        </button>
      </div>

      <div className={css.title}>{title}</div>

      {debug && (
        <div className={bindingCss.debug}>
          <span>{stringifyType(context.type)}</span>
        </div>
      )}

      <div className={css.binding}>
        <BindingMenu bindingId="" />
        <Binding ref={(ref) => setBindingRef("", ref)} bindingId={""} />
      </div>
    </div>
  );
}

export default Program;
