import rawFhirSchema from "./fhir-schema.json";

const has = (obj, field) => Object.prototype.hasOwnProperty.call(obj, field);

function indexFhirSchemas(fhirSchema) {
  let result = {};
  fhirSchema.forEach((schema) => {
    if (has(schema, "id")) result[schema["id"]] = schema;
    if (has(schema, "url")) result[schema["url"]] = schema;
  });
  return result;
}

const fhirSchema = indexFhirSchemas(rawFhirSchema);

export function resolveElements(node) {
  let elements = [];
  if (node) {
    if (has(node, "elements")) {
      elements = elements.concat(Object.entries(node["elements"]));
    }
    let typeDefinition = null;
    if (has(node, "type") && !has(node, "id")) {
      typeDefinition = fhirSchema[node["type"]];
      if (typeDefinition && has(typeDefinition, "elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    } else if (has(node, "elementReference")) {
      typeDefinition = resolvePath(node["elementReference"]);
      if (typeDefinition && has(typeDefinition, "elements")) {
        elements = elements.concat(Object.entries(typeDefinition["elements"]));
      }
    }
    let baseNode = typeDefinition || node;
    while (baseNode && has(baseNode, "base")) {
      baseNode = fhirSchema[baseNode["base"]];
      if (baseNode && has(baseNode, "elements")) {
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
    if (has(currentNode, field)) {
      return currentNode[field];
    }
    if (has(currentNode, "elements")) {
      let elements = currentNode["elements"];
      if (has(elements, field)) {
        return elements[field];
      }
    }
    if (has(currentNode, "elementReference")) {
      return resolvePath(currentNode["elementReference"]);
    }
    if (has(currentNode, "base")) {
      currentNode = fhirSchema[currentNode["base"]];
    } else if (has(currentNode, "type")) {
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
