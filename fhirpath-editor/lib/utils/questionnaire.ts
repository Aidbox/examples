import type {
  IComplexType,
  QuestionnaireItem,
  QuestionnaireItemRegistry,
  Type,
} from "../types/internal";
import {
  ComplexType,
  PrimitiveBooleanType,
  PrimitiveDecimalType,
  PrimitiveStringType,
  PrimitiveUriType,
  SingleType,
} from "./type";

function getReferenceType(item: QuestionnaireItem): IComplexType | undefined {
  const resourceType = item.extension?.find(
    ({ url }) =>
      url ===
      "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource",
  )?.valueCode;
  if (resourceType) {
    return ComplexType([resourceType]);
  }
}

export function getItems(questionnaire: {
  item: QuestionnaireItem[];
}): QuestionnaireItemRegistry {
  const index: QuestionnaireItemRegistry = {};

  function walk(item: QuestionnaireItem, single: boolean) {
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
      let type: Type | undefined = item.type === "boolean" ? PrimitiveBooleanType :
        item.type === "decimal" ? PrimitiveDecimalType :
        item.type === "integer" ? PrimitiveDecimalType :
        item.type === "date" ? PrimitiveDecimalType :
        item.type === "dateTime" ? PrimitiveDecimalType :
        item.type === "time" ? PrimitiveDecimalType :
        item.type === "string" ? PrimitiveStringType :
        item.type === "text" ? PrimitiveStringType :
        item.type === "url" ? PrimitiveUriType :
        item.type === "choice" ? PrimitiveDecimalType :
        item.type === "open-choice" ? PrimitiveDecimalType :
        item.type === "attachment" ? ComplexType(['Attachment']) :
        item.type === "reference" ? getReferenceType(item) :
        item.type === "quantity" ? PrimitiveDecimalType : undefined;

      if (type) {
        if (item.repeats) {
          single = false;
        }

        if (single) {
          type = SingleType(type);
        }

        index[item.linkId] = {
          text: item.text,
          type: type,
          item,
        };
      }
    }

    if (item.item) {
      item.item.forEach((item) => walk(item, single));
    }
  }

  questionnaire?.item?.forEach((item) => walk(item, true));
  return index;
}
