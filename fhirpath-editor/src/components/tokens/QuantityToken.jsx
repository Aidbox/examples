import React from "react";

// Common units used in FHIR
const commonUnits = [
  // Time units
  "years",
  "months",
  "weeks",
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds",
  // Weight units
  "kg",
  "g",
  "mg",
  // Length units
  "m",
  "cm",
  "mm",
  "in",
  // Volume units
  "L",
  "mL",
  // Vital sign units
  "mmHg",
  // Lab value units
  "mmol/L",
  "mg/dL",
  // Medication units
  "U",
  "IU",
  // Other
  "kcal",
  "%",
];

const QuantityToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value || token.value === "";
  const valueAndUnit = empty
    ? { value: "", unit: "" }
    : JSON.parse(token.value);

  const handleValueChange = (e) => {
    const newValue = e.target.value;
    onChange({
      ...token,
      value: JSON.stringify({
        ...valueAndUnit,
        value: newValue,
      }),
    });
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    onChange({
      ...token,
      value: JSON.stringify({
        ...valueAndUnit,
        unit: newUnit,
      }),
    });
  };

  return (
    <div
      className="inline-flex data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300 data-[empty]:rounded-md"
      data-testid="quantity-token"
      data-empty={empty || valueAndUnit.value === "" || undefined}
    >
      <input
        ref={ref}
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-l field-sizing-content text-purple-800 tabular-nums placeholder:text-gray-400`}
        data-empty={empty || valueAndUnit.value === "" || undefined}
        placeholder="0"
        type="text"
        pattern="-?[0-9]*\.?[0-9]*"
        inputMode="decimal"
        value={valueAndUnit.value}
        onChange={handleValueChange}
      />
      <select
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-r field-sizing-content text-purple-800 appearance-none`}
        data-empty={!valueAndUnit.unit || valueAndUnit.unit === "" || undefined}
        value={valueAndUnit.unit}
        onChange={handleUnitChange}
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
