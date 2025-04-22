import {
  IFhirType,
  IPrimitiveBase64BinaryType,
  IPrimitiveBooleanType,
  IPrimitiveCanonicalType,
  IPrimitiveCodeType,
  IPrimitiveDateTimeType,
  IPrimitiveDateType,
  IPrimitiveDecimalType,
  IPrimitiveIdType,
  IPrimitiveInstantType,
  IPrimitiveIntegerType,
  IPrimitiveMarkdownType,
  IPrimitiveOidType,
  IPrimitivePositiveIntegerType,
  IPrimitiveStringType,
  IPrimitiveTimeType,
  IPrimitiveUnsignedIntegerType,
  IPrimitiveUriType,
  IPrimitiveUrlType,
  IPrimitiveUuidType,
  IPrimitiveXhtmlType,
  IType,
  TypeName,
} from "@/types/internal";
import {
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  extendType,
  IntegerType,
  StringType,
  TimeType,
  unwrapSingle,
  wrapSingle,
} from "./type";
import { hasProperty } from "./misc";

export const PrimitiveCodeType: IPrimitiveCodeType = {
  type: TypeName.PrimitiveCode,
};
extendType(PrimitiveCodeType, StringType);

export const PrimitiveBooleanType: IPrimitiveBooleanType = {
  type: TypeName.PrimitiveBoolean,
};
extendType(PrimitiveBooleanType, BooleanType);

export const PrimitiveStringType: IPrimitiveStringType = {
  type: TypeName.PrimitiveString,
};
extendType(PrimitiveStringType, StringType);

export const PrimitiveUriType: IPrimitiveUriType = {
  type: TypeName.PrimitiveUri,
};
extendType(PrimitiveUriType, StringType);

export const PrimitiveDateType: IPrimitiveDateType = {
  type: TypeName.PrimitiveDate,
};
extendType(PrimitiveDateType, DateType);

export const PrimitiveDateTimeType: IPrimitiveDateTimeType = {
  type: TypeName.PrimitiveDateTime,
};
extendType(PrimitiveDateTimeType, DateTimeType);

export const PrimitiveDecimalType: IPrimitiveDecimalType = {
  type: TypeName.PrimitiveDecimal,
};
extendType(PrimitiveDecimalType, DecimalType);

export const PrimitiveMarkdownType: IPrimitiveMarkdownType = {
  type: TypeName.PrimitiveMarkdown,
};
extendType(PrimitiveMarkdownType, StringType);

export const PrimitiveCanonicalType: IPrimitiveCanonicalType = {
  type: TypeName.PrimitiveCanonical,
};
extendType(PrimitiveCanonicalType, StringType);

export const PrimitiveTimeType: IPrimitiveTimeType = {
  type: TypeName.PrimitiveTime,
};
extendType(PrimitiveTimeType, TimeType);

export const PrimitiveIdType: IPrimitiveIdType = {
  type: TypeName.PrimitiveId,
};
extendType(PrimitiveIdType, StringType);

export const PrimitiveIntegerType: IPrimitiveIntegerType = {
  type: TypeName.PrimitiveInteger,
};
extendType(PrimitiveIntegerType, IntegerType);

export const PrimitivePositiveIntegerType: IPrimitivePositiveIntegerType = {
  type: TypeName.PrimitivePositiveInteger,
};
extendType(PrimitivePositiveIntegerType, IntegerType);

export const PrimitiveUnsignedIntegerType: IPrimitiveUnsignedIntegerType = {
  type: TypeName.PrimitiveUnsignedInteger,
};
extendType(PrimitiveUnsignedIntegerType, IntegerType);

export const PrimitiveInstantType: IPrimitiveInstantType = {
  type: TypeName.PrimitiveInstant,
};
extendType(PrimitiveInstantType, DateTimeType);

export const PrimitiveUuidType: IPrimitiveUuidType = {
  type: TypeName.PrimitiveUuid,
};
extendType(PrimitiveUuidType, StringType);

export const PrimitiveUrlType: IPrimitiveUrlType = {
  type: TypeName.PrimitiveUrl,
};
extendType(PrimitiveUrlType, StringType);

export const PrimitiveOidType: IPrimitiveOidType = {
  type: TypeName.PrimitiveOid,
};
extendType(PrimitiveOidType, StringType);

export const PrimitiveXhtmlType: IPrimitiveXhtmlType = {
  type: TypeName.PrimitiveXhtml,
};
extendType(PrimitiveXhtmlType, StringType);

export const PrimitiveBase64BinaryType: IPrimitiveBase64BinaryType = {
  type: TypeName.PrimitiveBase64Binary,
};
extendType(PrimitiveBase64BinaryType, StringType);

export const primitiveTypeMap: Record<string, IType> = {
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

export interface IFhirElement {
  // shape
  array?: boolean;
  scalar?: boolean;
  // cardinality
  min?: number;
  max?: number;
  // choice type
  choiceOf?: string;
  choices?: string[];
  // requires and exclusions
  excluded?: string[];
  required?: string[];
  // type reference
  elementReference?: string[];
  type?: string;
  // nested elements
  elements?: IFhirElements;
}

export type IFhirElements = Record<string, IFhirElement>;

export interface IFhirSchema {
  id: string;
  url: string;
  type: string;
  derivation: "specialization" | "constraint";
  kind: "complex-type" | "logical" | "primitive-type" | "resource";
  base?: string;
  // requires and exclusions
  excluded?: string[];
  required?: string[];
  // nested elements
  elements?: IFhirElements;
}

type IFhirNode = IFhirSchema | IFhirElement | IFhirElements;
export type IFhirRegistry = Record<string, IFhirSchema>;

export interface Field {
  name: string;
  type: IType;
}

export const typePrimitiveMap: Partial<Record<TypeName, string>> =
  Object.fromEntries(
    Object.entries(primitiveTypeMap).map(([key, value]) => [value.type, key]),
  );

export const FhirType = (schemaReference: string[]): IFhirType => ({
  type: TypeName.FhirType,
  schemaReference,
});

export function indexFhirSchemas(fhirSchemaList: IFhirSchema[]): IFhirRegistry {
  let result: IFhirRegistry = {};
  fhirSchemaList.forEach((schema) => {
    if (hasProperty(schema, "id")) result[schema.id] = schema;
    if (hasProperty(schema, "url")) result[schema.url] = schema;
  });
  return result;
}

function resolveElements(
  node: IFhirSchema | IFhirElement,
  registry: IFhirRegistry,
): { [p: string]: IFhirElement | IFhirSchema } {
  let result: [string, IFhirSchema | IFhirElement][] = [];
  if (node) {
    if (node.elements) {
      result = result.concat(Object.entries(node.elements));
    }

    let typeDefinition: IFhirSchema | IFhirElement | undefined;

    if (node.type && !(node as IFhirSchema).id) {
      typeDefinition = registry[node.type];
      if (typeDefinition?.elements) {
        result = result.concat(Object.entries(typeDefinition.elements));
      }
    } else {
      const elementReference = (node as IFhirElement).elementReference;
      typeDefinition =
        elementReference && resolvePath(elementReference, registry);

      if (elementReference) {
        if (typeDefinition?.elements) {
          result = result.concat(Object.entries(typeDefinition.elements));
        }
      }
    }

    let baseNode = (typeDefinition || node) as IFhirSchema;
    while (baseNode.base) {
      baseNode = registry[baseNode["base"]];
      if (baseNode?.elements) {
        result = result.concat(Object.entries(baseNode.elements));
      }
    }
  }
  return Object.fromEntries(result);
}

function resolveField(
  field: string,
  node: IFhirNode,
  registry: IFhirRegistry,
): IFhirNode | undefined {
  let currentNode = node;
  let visitedTypes = new Set();
  while (currentNode) {
    const currentNodeAsElements = currentNode as IFhirElements;
    const currentNodeAsElement = currentNode as IFhirElement;
    const currentNodeAsSchema = currentNode as IFhirSchema;

    if (currentNodeAsElements[field]) {
      return currentNodeAsElements[field];
    }
    if (currentNodeAsElement.elements) {
      const element = currentNodeAsElement.elements[field];
      if (element) {
        return element;
      }
    }
    if (currentNodeAsElement.elementReference) {
      return resolvePath(currentNodeAsElement.elementReference, registry);
    }
    if (currentNodeAsSchema.base) {
      currentNode = registry[currentNodeAsSchema.base];
    } else if (currentNodeAsSchema.type) {
      currentNode = registry[currentNodeAsSchema.type];
    } else {
      return undefined;
    }
    if (currentNode) {
      let id = currentNodeAsSchema.id;
      if (visitedTypes.has(id)) {
        return undefined;
      }
      visitedTypes.add(id);
    }
  }
  return undefined;
}

function resolvePath(
  path: string[],
  registry: IFhirRegistry,
): IFhirSchema | IFhirElement | undefined {
  if (path.length > 0) {
    let currentNode: IFhirNode | undefined = registry[path[0]];
    if (!currentNode) {
      return undefined;
    }
    for (let field of path.slice(1)) {
      currentNode = resolveField(field, currentNode, registry);
      if (!currentNode) {
        return undefined;
      }
    }
    return currentNode;
  }
  return undefined;
}

const cache = new Map();

function fieldSchemaToType(
  name: string,
  elements: Record<string, IFhirSchema | IFhirElement>,
  prefix: string[],
  single: boolean,
  registry: IFhirRegistry,
) {
  const element = elements[name];
  const elementAsFhirElement = element as IFhirElement;
  let result: IType;

  if (cache.has(element)) {
    result = cache.get(element);
  } else {
    const type = elementAsFhirElement.type;
    if (type && primitiveTypeMap[type]) {
      result = primitiveTypeMap[type];
    } else if (elementAsFhirElement.choices) {
      result = ChoiceType(
        elementAsFhirElement.choices.map((choice) =>
          fieldSchemaToType(choice, elements, prefix, single, registry),
        ),
      );
    } else if (
      type &&
      !element.elements &&
      !elementAsFhirElement.elementReference
    ) {
      result = FhirType([type]);
    } else {
      if (elementAsFhirElement.elementReference) {
        const referencedSchema = resolvePath(
          elementAsFhirElement.elementReference,
          registry,
        );
        if (referencedSchema && cache.has(referencedSchema)) {
          return cache.get(referencedSchema);
        }
      }
      result = FhirType([...prefix, name]);
    }
    cache.set(element, result);
  }

  return elementAsFhirElement.scalar && single ? wrapSingle(result) : result;
}

export function getFields(
  type: IType,
  registry: IFhirRegistry,
): Record<string, IType> {
  let single = false;
  if (type && type.type === TypeName.Single) {
    single = true;
    type = unwrapSingle(type);
  }

  if (type && type.type === TypeName.Type) {
    type = type.ofType;
  }

  if (type.type === TypeName.Quantity) {
    type = FhirType(["Quantity"]);
  }

  if (type) {
    const primitive = typePrimitiveMap[type.type];

    let schema =
      type.type === "FhirType"
        ? resolvePath(type.schemaReference, registry)
        : primitive
          ? resolvePath([primitive], registry)
          : undefined;

    if (schema) {
      const elements = resolveElements(schema, registry);
      return Object.fromEntries(
        Object.keys(elements).map((name) => [
          name,
          fieldSchemaToType(
            name,
            elements,
            type.type === "FhirType" ? type.schemaReference : [],
            single,
            registry,
          ),
        ]),
      );
    }
  }
  return {};
}
