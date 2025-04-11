import React from "react";
import { useProgramContext } from "@utils/store.jsx";

const commonUnits = [
  "years",
  "months",
  "weeks",
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds",
  "kg",
  "g",
  "mg",
  "m",
  "cm",
  "mm",
  "in",
  "L",
  "mL",
  "mmHg",
  "mmol/L",
  "mg/dL",
  "U",
  "IU",
  "kcal",
  "%",
];

const QuantityToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const valueEmpty = token.value.value === "";
  const unitEmpty = !token.value.unit || token.value.unit === "";

  return (
    <div
      className="inline-flex data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300 data-[empty]:rounded-md"
      data-testid="quantity-token"
      data-empty={valueEmpty || undefined}
    >
      <input
        ref={ref}
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-l-md field-sizing-content text-pink-500 tabular-nums placeholder:text-gray-400`}
        data-empty={valueEmpty || undefined}
        placeholder="0"
        type="text"
        pattern="-?[0-9]*\.?[0-9]*"
        inputMode="decimal"
        value={token.value.value}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, (token) => {
            token.value.value = e.target.value;
          })
        }
      />
      <select
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-r-md field-sizing-content text-pink-500 appearance-none`}
        data-empty={unitEmpty || undefined}
        value={token.value.unit || ""}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, (token) => {
            token.value.unit = e.target.value;
          })
        }
      >
        {commonUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </div>
  );
});

export default QuantityToken;
