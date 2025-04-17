import {
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  extendType,
  IntegerType,
  QuantityType,
  SingleType,
  StringType,
  TimeType,
  TypeType,
  unwrapSingle,
  wrapSingle,
} from "./type.js";
import { hasProperty } from "@utils/misc.js";

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

export function indexFhirSchemas(fhirSchema) {
  let result = {};
  fhirSchema.forEach((schema) => {
    if (hasProperty(schema, "id")) result[schema["id"]] = schema;
    if (hasProperty(schema, "url")) result[schema["url"]] = schema;
  });
  return result;
}

function resolveElements(node, fhirSchema) {
  let elements = [];
  if (node) {
    if (hasProperty(node, "elements")) {
      elements = elements.concat(Object.entries(node["elements"]));
    }
    let typeDefinition = null;
    if (hasProperty(node, "type") && !hasProperty(node, "id")) {
      typeDefinition = fhirSchema[node["type"]];
      if (typeDefinition && hasProperty(typeDefinition, "elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    } else if (hasProperty(node, "elementReference")) {
      typeDefinition = resolvePath(node["elementReference"], fhirSchema);
      if (typeDefinition && hasProperty(typeDefinition, "elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    }
    let baseNode = typeDefinition || node;
    while (baseNode && hasProperty(baseNode, "base")) {
      baseNode = fhirSchema[baseNode["base"]];
      if (baseNode && hasProperty(baseNode, "elements")) {
        elements = elements.concat(Object.entries(baseNode["elements"]));
      }
    }
  }
  return elements;
}

function resolveField(field, node, fhirSchema) {
  let currentNode = node;
  let visitedTypes = new Set();
  while (currentNode) {
    if (hasProperty(currentNode, field)) {
      return currentNode[field];
    }
    if (hasProperty(currentNode, "elements")) {
      let elements = currentNode["elements"];
      if (hasProperty(elements, field)) {
        return elements[field];
      }
    }
    if (hasProperty(currentNode, "elementReference")) {
      return resolvePath(undefined, currentNode["elementReference"]);
    }
    if (hasProperty(currentNode, "base")) {
      currentNode = fhirSchema[currentNode["base"]];
    } else if (hasProperty(currentNode, "type")) {
      currentNode = fhirSchema[currentNode["type"]];
    } else {
      return null;
    }
    if (currentNode) {
      let id = currentNode["id"];
      if (visitedTypes.has(id)) {
        return null;
      }
      visitedTypes.add(id);
    }
  }
  return null;
}

function resolvePath(path, fhirSchema) {
  if (path.length > 0) {
    let currentNode = fhirSchema[path[0]];
    if (currentNode === null || currentNode === undefined) {
      return null;
    }
    for (let field of path.slice(1)) {
      currentNode = resolveField(field, currentNode, fhirSchema);
      if (currentNode === null) {
        return null;
      }
    }
    return currentNode;
  }
  return null;
}

const cache = new Map();

function fieldSchemaToType(
  fieldName,
  siblingSchemas,
  schemaReference,
  single,
  fhirSchema,
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
          fieldSchemaToType(
            choice,
            siblingSchemas,
            schemaReference,
            single,
            fhirSchema,
          ),
        ),
      );
    } else if (!fieldSchema.elements && !fieldSchema.elementReference) {
      result = FhirType([fieldSchema.type || fieldSchema.base]);
    } else {
      if (fieldSchema.elementReference) {
        const referencedSchema = resolvePath(
          fieldSchema.elementReference,
          fhirSchema,
        );
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

export function getFields(type, fhirSchema) {
  let single = false;
  if (type && type.type === SingleType.type) {
    single = true;
    type = unwrapSingle(type);
  }

  if (type && type.type === TypeType.type) {
    type = type.ofType;
  }

  if (type.type === QuantityType.type) {
    type = FhirType(["Quantity"]);
  }

  if (type) {
    let schema =
      type.type === "FhirType"
        ? resolvePath(type.schemaReference, fhirSchema)
        : typePrimitiveMap[type.type]
          ? resolvePath([typePrimitiveMap[type.type]], fhirSchema)
          : undefined;

    if (schema) {
      const elements = Object.fromEntries(resolveElements(schema, fhirSchema));
      return Object.fromEntries(
        Object.keys(elements).map((fieldName) => [
          fieldName,
          fieldSchemaToType(
            fieldName,
            elements,
            type.schemaReference,
            single,
            fhirSchema,
          ),
        ]),
      );
    }
  }
  return {};
}
