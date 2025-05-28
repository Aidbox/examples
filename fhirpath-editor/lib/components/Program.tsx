import { memo, ReactNode, useCallback } from "react";
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
  explicitName?: string;
};

const Program = memo(function Program({
  className,
  title,
  placeholder,
  explicitName,
}: ProgramProps) {
  const style = useStyle();
  const text = useText();
  const { addBinding, debug, empty } = useProgramContext((state) => ({
    addBinding: state.addBinding,
    debug: state.getDebug(),
    empty: !state.program.expression.length,
  }));

  const bindingIds = useProgramContext((state) =>
    state.program.bindings.map((b) => b.id),
  );

  const onClick = useCallback(() => addBinding({ name: "var1" }), [addBinding]);

  const context = useProgramContext((state) => state.getContext());

  return (
    <div
      className={clx(
        style.program.container,
        debug && style.program.extended,
        className,
      )}
    >
      <div className={style.program.title}>{text.program.title.variables}</div>

      {bindingIds.map((bindingId) => (
        <div key={bindingId} className={style.program.binding}>
          <BindingMenu bindingId={bindingId} />

          <Binding bindingId={bindingId} />
        </div>
      ))}

      <div className={style.program.define}>
        <button onClick={onClick}>
          <Plus size={14} /> {text.program.define}
        </button>
      </div>

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
          <span></span>
          <Binding
            bindingId={""}
            placeholder={placeholder || text.program.placeholder}
            explicitName={explicitName}
          />
        </div>
      </div>
    </div>
  );
});

export default Program;
