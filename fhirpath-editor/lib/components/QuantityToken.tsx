import { forwardRef, Ref } from "react";
import { useProgramContext } from "../utils/store";
import { UcumLhcUtils, UnitTables } from "@lhncbc/ucum-lhc";
import { upperFirst } from "../utils/misc";
import Dropdown from "./Dropdown";
import { IQuantityToken, TokenComponentProps } from "../types/internal";

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
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken } = useProgramContext((state) => ({
      token: state.getToken(bindingId, tokenIndex) as IQuantityToken,
      updateToken: state.updateToken,
    }));

    return (
      <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600">
        <input
          ref={forwardedRef as Ref<HTMLInputElement>}
          className="focus:outline-none field-sizing-content"
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
          keyFn={(unit) => unit.value}
          onClick={(unit) =>
            updateToken<IQuantityToken>(bindingId, tokenIndex, (token) => {
              token.value.unit = unit.value;
            })
          }
          renderReference={(mergeProps, ref) => (
            <button
              ref={ref}
              {...mergeProps({
                className: `cursor-pointer focus:outline-none`,
              })}
            >
              {token.value.unit || ""}
            </button>
          )}
          renderItem={(unit) => (
            <>
              <span />
              <span className="truncate">{unit.value}</span>
              <div className="text-sm text-gray-500 truncate flex-1 text-right">
                {unit.name}
              </div>
            </>
          )}
        />
      </div>
    );
  },
);

export default QuantityToken;
