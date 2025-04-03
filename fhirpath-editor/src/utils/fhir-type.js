import { resolveElements, resolvePath } from "./fhir-schema.js";
import {
  BooleanType,
  ChoiceType,
  CollectionType,
  DateTimeType,
  DateType,
  DecimalType,
  extendType,
  IntegerType,
  StringType,
  TimeType,
  unwrapCollection,
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

export const FhirType = (schemaReference) => ({
  type: "FhirType",
  schemaReference,
});

export function fieldSchemaToType(schemaReference, siblingSchemas, fieldName) {
  const fieldSchema = siblingSchemas[fieldName];
  let result;
  if (primitiveTypeMap[fieldSchema.type]) {
    result = primitiveTypeMap[fieldSchema.type];
  } else if (fieldSchema.choices) {
    result = ChoiceType(
      fieldSchema.choices.map((choice) =>
        fieldSchemaToType(schemaReference, siblingSchemas, choice),
      ),
    );
  } else if (!fieldSchema.elements && !fieldSchema.elementReference) {
    result = FhirType([fieldSchema.type || fieldSchema.base]);
  } else {
    result = FhirType([...schemaReference, fieldName]);
  }
  if (fieldSchema.array) {
    result = CollectionType(result);
  }
  return result;
}

export function getFields(type) {
  type = unwrapCollection(type);
  if (type && type.type === "FhirType") {
    let schema = resolvePath(type.schemaReference);
    if (schema) {
      const elements = Object.fromEntries(resolveElements(schema));
      return Object.fromEntries(
        Object.keys(elements).map((fieldName) => [
          fieldName,
          fieldSchemaToType(type.schemaReference, elements, fieldName),
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
