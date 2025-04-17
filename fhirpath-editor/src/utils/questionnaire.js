import {
  FhirType,
  PrimitiveBooleanType,
  PrimitiveDecimalType,
  PrimitiveStringType,
  PrimitiveUriType,
} from "@utils/fhir.js";
import { ChoiceType, QuantityType, SingleType } from "@utils/type.js";

function getReferenceType(item) {
  const resourceType = item.extension.find(
    ({ url }) =>
      url ===
      "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource",
  ).valueCode;
  if (resourceType) {
    return FhirType([resourceType]);
  }
}

export function getItems(questionnaire) {
  const index = {};

  function walk(item, single) {
    if (!item.linkId || !item.type) {
      // Skip invalid items
      return;
    }

    if (
      !index[item.linkId] &&
      item.type !== "group" &&
      item.type !== "display"
    ) {
      // prettier-ignore
      let type = item.type === "boolean" ? PrimitiveBooleanType :
        item.type === "decimal" ? PrimitiveDecimalType :
        item.type === "integer" ? PrimitiveDecimalType :
        item.type === "date" ? PrimitiveDecimalType :
        item.type === "dateTime" ? PrimitiveDecimalType :
        item.type === "time" ? PrimitiveDecimalType :
        item.type === "string" ? PrimitiveStringType :
        item.type === "text" ? PrimitiveStringType :
        item.type === "url" ? PrimitiveUriType :
        item.type === "choice" ? FhirType(['Coding']) :
        item.type === "open-choice" ? ChoiceType([FhirType(['Coding']), PrimitiveStringType]) :
        item.type === "attachment" ? FhirType(['Attachment']) :
        item.type === "reference" ? getReferenceType(item) :
        item.type === "quantity" ? QuantityType : undefined;

      if (item.repeats) {
        single = false;
      }

      if (single) {
        type = SingleType(type);
      }

      index[item.linkId] = {
        text: item.text,
        type: type,
      };
    }

    if (item.item) {
      item.item.forEach((item) => walk(item, single));
    }
  }

  questionnaire.item.forEach((item) => walk(item, true));
  return index;
}
