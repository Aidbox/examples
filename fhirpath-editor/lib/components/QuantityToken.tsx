import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { UcumLhcUtils, UnitTables } from "@lhncbc/ucum-lhc";
import { colors, upperFirst } from "../utils/misc";
import Dropdown from "./Dropdown";
import { IQuantityToken, TokenComponentProps } from "../types/internal";
import { useStyle } from "../style";
import { Scales } from "@phosphor-icons/react";

UcumLhcUtils.getInstance();

const units = [
  { value: "year", group: "time", name: "calendar year" },
  { value: "month", group: "time", name: "calendar month" },
  { value: "week", group: "time", name: "calendar week" },
  { value: "day", group: "time", name: "calendar day" },
  { value: "hour", group: "time", name: "calendar hour" },
  { value: "minute", group: "time", name: "calendar minute" },
  { value: "second", group: "time", name: "calendar second" },
  { value: "millisecond", group: "time", name: "millisecond" },
  ...Object.values(UnitTables.getInstance().unitCodes_).map((unit) => ({
    value: unit.csCode_,
    group: unit.property_,
    name: unit.name_,
  })),
];

const QuantityToken = forwardRef<HTMLElement, TokenComponentProps>(
  function QuantityToken({ bindingId, tokenIndex }, forwardedRef) {
    const style = useStyle();
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IQuantityToken,
      updateToken: state.updateToken,
    }));

    return (
      <div className={style.token.quantity.wrapper}>
        <input
          ref={forwardedRef as Ref<HTMLInputElement>}
          placeholder="0"
          type="text"
          pattern="-?[0-9]*\.?[0-9]*"
          inputMode="decimal"
          value={token.value.value}
          onChange={(e) =>
            updateToken<IQuantityToken>(bindingId, tokenIndex, (token) => {
              token.value.value = e.target.value;
            })
          }
        />

        <Dropdown
          items={units}
          searchFn={(unit, term) =>
            unit.value.toLowerCase().includes(term.toLowerCase()) ||
            unit.name.toLowerCase().includes(term.toLowerCase())
          }
          groupFn={(unit) => upperFirst(unit.group)}
          colorFn={() => colors.literal}
          keyFn={(unit) => unit.value}
          onClick={(unit) =>
            updateToken<IQuantityToken>(bindingId, tokenIndex, (token) => {
              token.value.unit = unit.value;
            })
          }
          renderReference={(mergeProps, ref) => (
            <button
              ref={ref}
              {...mergeProps({ className: style.token.quantity.button })}
            >
              {token.value.unit || ""}
            </button>
          )}
          renderItem={(unit) => (
            <>
              <span className={style.dropdown.icon}>
                <Scales size={14} />
              </span>
              <span className={style.dropdown.primary}>{unit.value}</span>
              <div className={style.dropdown.secondary}>{unit.name}</div>
            </>
          )}
        />
      </div>
    );
  },
);

export default QuantityToken;
