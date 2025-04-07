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
  // Check if value is empty or not an object
  const isEmpty = !token.value || typeof token.value !== "object";

  // Use default empty object if value is not valid
  const value = isEmpty ? { value: "", unit: "" } : token.value;

  const handleValueChange = (e) => {
    const newValue = e.target.value;
    onChange({
      ...token,
      value: {
        ...value,
        value: newValue,
      },
    });
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    onChange({
      ...token,
      value: {
        ...value,
        unit: newUnit,
      },
    });
  };

  // Determine if the token should be shown as empty
  const valueEmpty = isEmpty || value.value === "";
  const unitEmpty = isEmpty || !value.unit || value.unit === "";

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
        value={value.value}
        onChange={handleValueChange}
      />
      <select
        className={`focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded-r-md field-sizing-content text-pink-500 appearance-none`}
        data-empty={unitEmpty || undefined}
        value={value.unit || ""}
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
