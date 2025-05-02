import { ReactNode } from "react";
import Binding from "./Binding";
import BindingMenu from "./BindingMenu";
import { Plus } from "@phosphor-icons/react";
import { useProgramContext } from "../utils/store";
import { stringifyType } from "../utils/type";
import clx from "classnames";
import { useStyle } from "../style";
import { useText } from "../text";

type ProgramProps = {
  className?: string;
  title?: ReactNode;
};

function Program({ className = "", title }: ProgramProps) {
  const style = useStyle();
  const text = useText();
  const { addBinding, setBindingRef, debug, empty } = useProgramContext(
    (state) => ({
      addBinding: state.addBinding,
      setBindingRef: state.setBindingRef,
      debug: state.getDebug(),
      empty: !state.program.expression.length,
    }),
  );

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
      <div className={style.program.title}>
        {text.program.title.namedExpressions}
      </div>

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
        <button onClick={() => addBinding({ name: "var1" })}>
          <Plus size={14} /> {text.program.define}
        </button>
      </div>

      <div className={clx(style.program.main, empty && style.program.empty)}>
        <div className={style.program.title}>
          {title || text.program.title.mainExpression}
        </div>

        {debug && (
          <div className={style.binding.debug}>
            <span>{stringifyType(context.type)}</span>
          </div>
        )}

        <div className={style.program.binding}>
          {/*<BindingMenu bindingId="" />*/}
          <span></span>
          <Binding ref={(ref) => setBindingRef("", ref)} bindingId={""} />
        </div>
      </div>
    </div>
  );
}

export default Program;
