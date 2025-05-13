import {
  FhirElement,
  FhirElements,
  FhirNode,
  FhirRegistry,
  FhirSchema,
  Type,
  TypeName,
} from "../types/internal";
import {
  ChoiceType,
  ComplexType,
  primitiveTypeMap,
  SingleType,
  typePrimitiveMap,
  unwrapSingle,
} from "./type";
import { assertDefined } from "./misc.ts";

function resolveElements(
  node: FhirSchema | FhirElement,
  registry: FhirRegistry,
): { [p: string]: FhirElement | FhirSchema } {
  let result: [string, FhirSchema | FhirElement][] = [];
  if (node) {
    if (node.elements) {
      result = result.concat(Object.entries(node.elements));
    }

    let typeDefinition: FhirSchema | FhirElement | undefined;

    if (node.type && !(node as FhirSchema).id) {
      typeDefinition = registry[node.type];
      if (typeDefinition?.elements) {
        result = result.concat(Object.entries(typeDefinition.elements));
      }
    } else {
      const elementReference = (node as FhirElement).elementReference;
      typeDefinition =
        elementReference && resolvePath(elementReference, registry);

      if (elementReference) {
        if (typeDefinition?.elements) {
          result = result.concat(Object.entries(typeDefinition.elements));
        }
      }
    }

    let baseNode = (typeDefinition || node) as FhirSchema;
    while (baseNode.base) {
      const foundNode = registry[baseNode["base"]];
      assertDefined(foundNode);

      baseNode = foundNode;
      if (baseNode?.elements) {
        result = result.concat(Object.entries(baseNode.elements));
      }
    }
  }
  return Object.fromEntries(result);
}

function resolveField(
  field: string,
  node: FhirNode,
  registry: FhirRegistry,
): FhirNode | undefined {
  let currentNode = node;
  const visitedTypes = new Set();
  while (currentNode) {
    const currentNodeAsElements = currentNode as FhirElements;
    const currentNodeAsElement = currentNode as FhirElement;
    const currentNodeAsSchema = currentNode as FhirSchema;

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
      const foundNode = registry[currentNodeAsSchema.base];
      if (!foundNode) return undefined;
      currentNode = foundNode;
    } else if (currentNodeAsSchema.type) {
      const foundNode = registry[currentNodeAsSchema.type];
      if (!foundNode) return undefined;
      currentNode = foundNode;
    } else {
      return undefined;
    }
    if (currentNode) {
      const id = currentNodeAsSchema.id;
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
  registry: FhirRegistry,
): FhirSchema | FhirElement | undefined {
  if (path.length > 0) {
    let currentNode: FhirNode | undefined = path[0]
      ? registry[path[0]]
      : undefined;
    if (!currentNode) {
      return undefined;
    }
    for (const field of path.slice(1)) {
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
  elements: Record<string, FhirSchema | FhirElement>,
  prefix: string[],
  single: boolean,
  registry: FhirRegistry,
) {
  const element = elements[name];
  assertDefined(element);

  const elementAsFhirElement = element as FhirElement;
  let result: Type;

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
      result = ComplexType([type]);
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
      result = ComplexType([...prefix, name]);
    }
    cache.set(element, result);
  }

  return elementAsFhirElement.scalar && single ? SingleType(result) : result;
}

export function getFields(
  type: Type,
  registry: FhirRegistry,
): Record<string, Type> {
  let single = false;
  if (type && type.name === TypeName.Single) {
    single = true;
    type = unwrapSingle(type);
  }

  if (type && type.name === TypeName.Type) {
    type = type.ofType;
  }

  if (type.name === TypeName.Quantity) {
    type = ComplexType(["Quantity"]);
  }

  if (type) {
    const primitive = typePrimitiveMap[type.name];

    const schema =
      type.name === TypeName.Complex
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
            type.name === TypeName.Complex ? type.schemaReference : [],
            single,
            registry,
          ),
        ]),
      );
    }
  }
  return {};
}
