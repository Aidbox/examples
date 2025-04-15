import { resolveElements, resolvePath } from "./fhir-schema.js";
import {
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  extendType,
  IntegerType,
  SingleType,
  StringType,
  TimeType,
  unwrapSingle, wrapSingle,
} from "./type.js";

export const PrimitiveCodeType = { type: "PrimitiveCode" };
extendType(PrimitiveCodeType, StringType);

export const PrimitiveBooleanType = { type: "PrimitiveBoolean" };
extendType(PrimitiveBooleanType, BooleanType);

export const PrimitiveStringType = { type: "PrimitiveString" };
extendType(PrimitiveStringType, StringType);

export const PrimitiveUriType = { type: "PrimitiveUri" };
extendType(PrimitiveUriType, StringType);

export const PrimitiveDateType = { type: "PrimitiveDate" };
extendType(PrimitiveDateType, DateType);

export const PrimitiveDateTimeType = { type: "PrimitiveDateTime" };
extendType(PrimitiveDateTimeType, DateTimeType);

export const PrimitiveDecimalType = { type: "PrimitiveDecimal" };
extendType(PrimitiveDecimalType, DecimalType);

export const PrimitiveMarkdownType = { type: "PrimitiveMarkdown" };
extendType(PrimitiveMarkdownType, StringType);

export const PrimitiveCanonicalType = { type: "PrimitiveCanonical" };
extendType(PrimitiveCanonicalType, StringType);

export const PrimitiveTimeType = { type: "PrimitiveTime" };
extendType(PrimitiveTimeType, TimeType);

export const PrimitiveIdType = { type: "PrimitiveId" };
extendType(PrimitiveIdType, StringType);

export const PrimitiveIntegerType = { type: "PrimitiveInteger" };
extendType(PrimitiveIntegerType, IntegerType);

export const PrimitivePositiveIntegerType = {
  type: "PrimitivePositiveInteger",
};
extendType(PrimitivePositiveIntegerType, IntegerType);

export const PrimitiveUnsignedIntegerType = {
  type: "PrimitiveUnsignedInteger",
};
extendType(PrimitiveUnsignedIntegerType, IntegerType);

export const PrimitiveInstantType = { type: "PrimitiveInstant" };
extendType(PrimitiveInstantType, DateTimeType);

export const PrimitiveUuidType = { type: "PrimitiveUuid" };
extendType(PrimitiveUuidType, StringType);

export const PrimitiveUrlType = { type: "PrimitiveUrl" };
extendType(PrimitiveUrlType, StringType);

export const PrimitiveOidType = { type: "PrimitiveOid" };
extendType(PrimitiveOidType, StringType);

export const PrimitiveXhtmlType = { type: "PrimitiveXhtml" };
extendType(PrimitiveXhtmlType, StringType);

export const PrimitiveBase64BinaryType = { type: "PrimitiveBase64Binary" };

export const primitiveTypeMap = {
  string: PrimitiveStringType,
  boolean: PrimitiveBooleanType,
  integer: PrimitiveIntegerType,
  positiveInteger: PrimitivePositiveIntegerType,
  unsignedInteger: PrimitiveUnsignedIntegerType,
  decimal: PrimitiveDecimalType,
  uri: PrimitiveUriType,
  url: PrimitiveUrlType,
  canonical: PrimitiveCanonicalType,
  oid: PrimitiveOidType,
  id: PrimitiveIdType,
  markdown: PrimitiveMarkdownType,
  code: PrimitiveCodeType,
  dateTime: PrimitiveDateTimeType,
  date: PrimitiveDateType,
  instant: PrimitiveInstantType,
  time: PrimitiveTimeType,
  uuid: PrimitiveUuidType,
  xhtml: PrimitiveXhtmlType,
  base64Binary: PrimitiveBase64BinaryType,
};

export const typePrimitiveMap = Object.fromEntries(
  Object.entries(primitiveTypeMap).map(([key, value]) => [value.type, key]),
);

export const FhirType = (schemaReference) => ({
  type: "FhirType",
  schemaReference,
});
FhirType.type = "FhirType";

const cache = new Map();

export function fieldSchemaToType(
  single,
  schemaReference,
  siblingSchemas,
  fieldName,
) {
  const fieldSchema = siblingSchemas[fieldName];
  let result;

  if (cache.has(fieldSchema)) {
    result = cache.get(fieldSchema);
  } else {
    if (primitiveTypeMap[fieldSchema.type]) {
      result = primitiveTypeMap[fieldSchema.type];
    } else if (fieldSchema.choices) {
      result = ChoiceType(
        fieldSchema.choices.map((choice) =>
          fieldSchemaToType(single, schemaReference, siblingSchemas, choice),
        ),
      );
    } else if (!fieldSchema.elements && !fieldSchema.elementReference) {
      result = FhirType([fieldSchema.type || fieldSchema.base]);
    } else {
      if (fieldSchema.elementReference) {
        const referencedSchema = resolvePath(fieldSchema.elementReference);
        if (referencedSchema && cache.has(referencedSchema)) {
          return cache.get(referencedSchema);
        }
      }
      result = FhirType([...schemaReference, fieldName]);
    }
    cache.set(fieldSchema, result);
  }

  return fieldSchema.scalar && single ? wrapSingle(result) : result;
}

export function getFields(type) {
  let single = false;
  if (type && type.type === SingleType.type) {
    single = true;
    type = unwrapSingle(type);
  }

  if (type) {
    let schema =
      type.type === "FhirType"
        ? resolvePath(type.schemaReference)
        : typePrimitiveMap[type.type]
          ? resolvePath([typePrimitiveMap[type.type]])
          : undefined;

    if (schema) {
      const elements = Object.fromEntries(resolveElements(schema));
      return Object.fromEntries(
        Object.keys(elements).map((fieldName) => [
          fieldName,
          fieldSchemaToType(single, type.schemaReference, elements, fieldName),
        ]),
      );
    }
  }
  return {};
}

export function getType(type) {
  if (type && type.schemaReference) {
    return resolvePath(type.schemaReference);
  }
  return null;
}
