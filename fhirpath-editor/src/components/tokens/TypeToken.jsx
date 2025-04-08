import React from "react";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  QuantityType,
  StringType,
  TimeType,
} from "@utils/type";
import { primitiveTypeMap } from "@utils/fhir-type";

const typeNames = {
  "Literal types": [
    IntegerType.type,
    DecimalType.type,
    StringType.type,
    BooleanType.type,
    DateType.type,
    DateTimeType.type,
    TimeType.type,
    QuantityType.type,
  ],
  "Primitive types": [],
  "Resource types": ["Patient", "Questionnaire", "Address"],
};

Object.values(primitiveTypeMap).forEach((type) => {
  typeNames["Primitive types"].push(type.type);
});

const TypeToken = React.forwardRef(({ token, onChange }, ref) => {
  const empty = !token.value;
  const invalid =
    !empty && !Object.values(typeNames).flat().includes(token.value);

  return (
    <select
      ref={ref}
      className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-teal-700 appearance-none data-[empty]:outline data-[empty]:not-hover:outline-dashed data-[empty]:outline-gray-300"
      data-testid="type-token"
      data-empty={empty || undefined}
      value={token.value || ""}
      onChange={(e) => onChange({ ...token, value: e.target.value })}
    >
      {invalid && (
        <option value={token.value} disabled>
          ⚠️ {token.value}
        </option>
      )}
      {Object.entries(typeNames).map(([group, types]) => (
        <optgroup key={group} label={group}>
          {types.map((type) => {
            const [, primitiveTypeName] = type.match(/^Primitive(.*)$/) || [];
            if (primitiveTypeName) {
              if (!typeNames["Literal types"].includes(primitiveTypeName)) {
                return (
                  <option key={type} value={type}>
                    {primitiveTypeName}
                  </option>
                );
              }
            } else {
              return (
                <option key={type} value={type}>
                  {type}
                </option>
              );
            }
          })}
        </optgroup>
      ))}
    </select>
  );
});

export default TypeToken;
