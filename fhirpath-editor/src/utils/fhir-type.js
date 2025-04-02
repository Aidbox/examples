import { resolveElements, resolvePath } from "./fhir-schema.js";
import { ChoiceType, CollectionType, unwrapCollection } from "./type.js";

export const FhirType = (schemaReference) => ({
  type: "FhirType",
  schemaReference,
});

export function fieldSchemaToType(schemaReference, siblingSchemas, fieldName) {
  const fieldSchema = siblingSchemas[fieldName];
  let result;
  if (fieldSchema.choices) {
    result = ChoiceType(
      fieldSchema.choices.map((choice) =>
        fieldSchemaToType(schemaReference, siblingSchemas, choice)
      )
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
        ])
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

// const x = [
//   "code",
//   "boolean",
//   "string",
//   "uri",
//   "date",
//   "decimal",
//   "markdown",
//   "pattern",
//   "value",
//   "canonical",
//   "time",
//   "id",
//   "integer",
//   "instant",
//   "uuid",
//   "url",
//   "oid",
//   "xhtml",
//   "binding",
// ];
