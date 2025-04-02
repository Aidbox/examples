import rawFhirSchema from "./fhir-schema.json";

function indexFhirSchemas(fhirSchema) {
  let result = {}
  fhirSchema.forEach(schema => {
    if (schema["id"]) result[schema["id"]] = schema
    if (schema["url"]) result[schema["url"]] = schema
  })
  return result
}

const fhirSchema = indexFhirSchemas(rawFhirSchema);

export function resolveElements(node) {
  let elements = [];
  if (node) {
    if (node.hasOwnProperty("elements")) {
      elements = elements.concat(Object.entries(node["elements"]));
    }
    let typeDefinition = null;
    if (node.hasOwnProperty("type") && !node.hasOwnProperty("id")) {
      typeDefinition = fhirSchema[node["type"]];
      if (typeDefinition && typeDefinition.hasOwnProperty("elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    } else if (node.hasOwnProperty("elementReference")) {
      typeDefinition = resolvePath(node["elementReference"]);
      if (typeDefinition && typeDefinition.hasOwnProperty("elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    }
    let baseNode = typeDefinition || node;
    while (baseNode && baseNode.hasOwnProperty("base")) {
      baseNode = fhirSchema[baseNode["base"]];
      if (baseNode && baseNode.hasOwnProperty("elements")) {
        elements = elements.concat(Object.entries(baseNode["elements"]));
      }
    }
  }
  return elements;
}

export function resolveField(node, field) {
  let currentNode = node;
  let visitedTypes = new Set();
  while (currentNode) {
    if (currentNode.hasOwnProperty(field)) {
      return currentNode[field];
    }
    if (currentNode.hasOwnProperty("elements")) {
      let elements = currentNode["elements"];
      if (elements.hasOwnProperty(field)) {
        return elements[field];
      }
    }
    if (currentNode.hasOwnProperty("elementReference")) {
      return resolvePath(currentNode["elementReference"]);
    }
    if (currentNode.hasOwnProperty("base")) {
      currentNode = fhirSchema[currentNode["base"]];
    } else if (currentNode.hasOwnProperty("type")) {
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

export function resolvePath(path) {
  if (path.length > 0) {
    let currentNode = fhirSchema[path[0]];
    if (currentNode === null || currentNode === undefined) {
      return null;
    }
    for (let field of path.slice(1)) {
      currentNode = resolveField(currentNode, field);
      if (currentNode === null) {
        return null;
      }
    }
    return currentNode;
  }
  return null;
}
