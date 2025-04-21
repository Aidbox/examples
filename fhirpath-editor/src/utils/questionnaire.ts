import {
  FhirType,
  PrimitiveBooleanType,
  PrimitiveDecimalType,
  PrimitiveStringType,
  PrimitiveUriType,
} from "@/utils/fhir";
import type { IFhirType, IType } from "@/types/internal";
import { SingleType } from "@/utils/type";

export type Item = {
  linkId: string;
  type: string;
  text?: string;
  repeats?: boolean;
  item?: Item[];
  extension?: { url: string; valueCode?: string }[];
};

export type QuestionnaireItemRegistry = {
  [linkId: string]: {
    text?: string;
    type: IType;
    item: Item;
  };
};
function getReferenceType(item: Item): IFhirType | undefined {
  const resourceType = item.extension?.find(
    ({ url }) =>
      url ===
      "http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource",
  )?.valueCode;
  if (resourceType) {
    return FhirType([resourceType]);
  }
}

export function getItems(questionnaire: {
  item: Item[];
}): QuestionnaireItemRegistry {
  const index: QuestionnaireItemRegistry = {};

  function walk(item: Item, single: boolean) {
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
      let type: IType | undefined = item.type === "boolean" ? PrimitiveBooleanType :
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
        item.type === "attachment" ? FhirType(['Attachment']) :
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

  questionnaire.item.forEach((item) => walk(item, true));
  return index;
}
