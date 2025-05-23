import { ComplexType, SingleType, UnknownType } from "./type";

export function detectValueType(value: any) {
  if (Array.isArray(value)) {
    if (value.length === 0 || !value[0].resourceType) {
      return UnknownType;
    }
    return ComplexType([value[0].resourceType]);
  }

  if (!value || typeof value !== "object") {
    return UnknownType;
  }

  const resourceType = value.resourceType;
  if (!resourceType || typeof resourceType !== "string") {
    return ComplexType(["Element"]);
  }

  return SingleType(ComplexType([resourceType]));
}
