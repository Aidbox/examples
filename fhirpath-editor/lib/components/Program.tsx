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
  placeholder?: string;
};

function Program({ className, title, placeholder }: ProgramProps) {
  const style = useStyle();
  const text = useText();
  const { allowBindings, addBinding, setBindingRef, debug, empty } =
    useProgramContext((state) => ({
      allowBindings: state.getAllowBindings(),
      addBinding: state.addBinding,
      setBindingRef: state.setBindingRef,
      debug: state.getDebug(),
      empty: !state.program.expression.length,
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
        !allowBindings && style.program.lightweight,
        className,
      )}
    >
      {allowBindings && (
        <>
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
        </>
      )}

      <div className={clx(style.program.main, empty && style.program.empty)}>
        {title !== null && (
          <div className={style.program.title}>
            {title || text.program.title.mainExpression}
          </div>
        )}

        {debug && (
          <div className={style.binding.debug}>
            <span>{stringifyType(context.type)}</span>
          </div>
        )}

        <div className={style.program.binding}>
          {/*<BindingMenu bindingId="" />*/}
          <span></span>
          <Binding
            ref={(ref) => setBindingRef("", ref)}
            bindingId={""}
            placeholder={placeholder || text.program.placeholder.mainExpression}
          />
        </div>
      </div>
    </div>
  );
}

export default Program;
