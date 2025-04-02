export const IntegerType = { type: "Integer" };
export const DecimalType = { type: "Decimal" };
export const StringType = { type: "String" };
export const BooleanType = { type: "Boolean" };
export const DateType = { type: "Date" };
export const DateTimeType = { type: "DateTime" };
export const TimeType = { type: "Time" };
export const QuantityType = { type: "Quantity" };

export const InvalidType = (error) => ({ type: "Invalid", error });
export const TypeType = (ofType) => ({ type: "Type", ofType });
export const CollectionType = (ofType) => ({ type: "Collection", ofType });
export const ChoiceType = (options) => ({ type: "Choice", options });
export const Generic = (name) => ({ type: "Generic", name });

export function stringifyType(t) {
  if (!t || typeof t !== "object") return String(t);

  switch (t.type) {
    case "Collection":
      return `Collection<${stringifyType(t.ofType)}>`;
    case "Choice":
      return t.options.map(stringifyType).join(" | ");
    case "Invalid":
      return `Invalid${t.error ? ` (${t.error})` : ""}`;
    case "FhirType":
      if (t.schemaReference.length === 1) {
        const [name] = t.schemaReference;
        if (name[0] === name[0].toLowerCase()) {
          return `Primitive${name[0].toUpperCase()}${name.slice(1)}`;
        } else {
          return name;
        }
      } else {
        return `${t.schemaReference[0]}${t.schemaReference
          .slice(1)
          .map((field) => `["${field}"]`)
          .join("")}`;
      }
    default:
      return t.type;
  }
}

export function unwrapCollection(t) {
  return t?.type === "Collection" ? t.ofType : t;
}

export function wrapCollection(t) {
  return CollectionType(t);
}

export function normalizeChoice(choice) {
  const options = [...choice.options];

  const seen = [];
  while (options.length > 0) {
    const opt = options.shift();
    if (!seen.some((t) => deepEqual(t, opt))) {
      if (opt.type === "Choice") {
        const normalized = normalizeChoice(opt);
        if (normalized.type === "Choice") {
          options.push(...normalized.options); // flatten
        } else {
          options.push(normalized);
        }
      } else {
        seen.push(opt);
      }
    }
  }

  return seen.length === 1 ? seen[0] : ChoiceType(seen);
}

export function promote(a, b) {
  const t1 = a?.type;
  const t2 = b?.type;
  if (!t1 || !t2) return null;

  if (t1 === t2) return a;

  const map = {
    Integer: { Decimal: DecimalType, Quantity: QuantityType },
    Decimal: { Integer: DecimalType, Quantity: QuantityType },
    Quantity: { Integer: QuantityType, Decimal: QuantityType },
  };

  return map[t1]?.[t2] || map[t2]?.[t1] || null;
}

export function stringifyBindings(bindings) {
  return Object.entries(bindings)
    .map(([k, v]) => `${k} = ${stringifyType(v)}`)
    .join(", ");
}

export function mergeBindings(a, b) {
  const result = { ...a };
  for (const key in b) {
    if (key in result) {
      if (!deepEqual(result[key], b[key])) return null; // conflict
    } else {
      result[key] = b[key];
    }
  }
  return result;
}

export function deepEqual(a, b) {
  if (a?.type === "Generic" || b?.type === "Generic") {
    return true;
  }
  if (a?.type === "Choice") {
    return a.options.some((opt) => deepEqual(opt, b));
  }
  if (b?.type === "Choice") {
    return b.options.some((opt) => deepEqual(opt, a));
  }

  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a == null || b == null) return a === b;

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function matchTypePattern(pattern, actual, bindings = {}) {
  let newBindings = { ...bindings };

  // If pattern is a Generic, record or check consistency
  if (pattern?.type === "Generic") {
    const name = pattern.name;

    if (bindings[name]) {
      if (!deepEqual(bindings[name], actual)) return null;
    } else {
      newBindings[name] = actual;
    }
    return newBindings;
  }

  // Choice handling — try each branch
  if (actual?.type === "Choice") {
    for (const option of actual.options) {
      const b = matchTypePattern(pattern, option, newBindings);
      if (b) return b;
    }
    return null;
  }

  // Basic type mismatch
  if (typeof pattern !== "object" || typeof actual !== "object") return null;
  if (pattern == null || actual == null) return null;
  // if (deepEqual(pattern, actual)) return bindings;

  // Ensure type matches
  if (pattern.type && actual.type && pattern.type !== actual.type) return null;

  // Go through pattern keys
  for (const key of Object.keys(pattern)) {
    if (!(key in actual)) return null;

    if (key === "ofType") {
      const sub = matchTypePattern(pattern[key], actual[key], newBindings);
      if (!sub) return null;
      newBindings = mergeBindings(newBindings, sub);
      if (!newBindings) return null;
    } else if (!deepEqual(pattern[key], actual[key])) return null;
  }

  return newBindings;
}

export function substituteBindings(type, bindings) {
  if (!type || typeof type !== "object") return type;

  if (type.type === "Generic") {
    return bindings[type.name] ?? type;
  }

  if (type.type === "Collection") {
    return CollectionType(substituteBindings(type.ofType, bindings));
  }

  if (type.type === "Choice") {
    return normalizeChoice(
      ChoiceType(type.options.map((opt) => substituteBindings(opt, bindings)))
    );
  }

  // For other object-based types, recurse keys if structural
  const result = { ...type };
  if ("keyOf" in type) {
    result.keyOf = substituteBindings(type.keyOf, bindings);
  }

  return result;
}

export const typeNames = [
  "Integer",
  "Decimal",
  "String",
  "Boolean",
  "Date",
  "DateTime",
  "Time",
  "Quantity",
  "Patient",
  "Questionnaire",
  "Address",
];
