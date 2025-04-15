import {
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  deepEqual,
  Generic,
  IntegerType,
  InvalidType,
  matchTypePattern,
  mergeBindings,
  normalizeChoice,
  promote,
  QuantityType,
  SingleType,
  StringType,
  substituteBindings,
  TimeType,
  TypeType,
} from "./type";

// Helper to define individual overload
const op = (name, left, right, returnType) => ({
  name: name,
  args: [
    { name: "left", type: left },
    { name: "right", type: right },
  ],
  returnType: typeof returnType === "function" ? returnType : () => returnType,
});

export const operatorMetadata = [
  // String concat
  op(
    "&",
    SingleType(StringType),
    SingleType(StringType),
    SingleType(StringType),
  ),

  // Arithmetic: +
  op(
    "+",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "+",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "+",
    SingleType(IntegerType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "+",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "+",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "+",
    SingleType(DecimalType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "+",
    SingleType(QuantityType),
    SingleType(IntegerType),
    SingleType(QuantityType),
  ),
  op(
    "+",
    SingleType(QuantityType),
    SingleType(DecimalType),
    SingleType(QuantityType),
  ),
  op(
    "+",
    SingleType(QuantityType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "+",
    SingleType(StringType),
    SingleType(StringType),
    SingleType(StringType),
  ),
  op("+", SingleType(DateType), SingleType(QuantityType), SingleType(DateType)),
  op(
    "+",
    SingleType(DateTimeType),
    SingleType(QuantityType),
    SingleType(DateTimeType),
  ),
  op("+", SingleType(TimeType), SingleType(QuantityType), SingleType(TimeType)),

  // Arithmetic: -
  op(
    "-",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "-",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "-",
    SingleType(IntegerType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "-",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "-",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "-",
    SingleType(DecimalType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "-",
    SingleType(QuantityType),
    SingleType(IntegerType),
    SingleType(QuantityType),
  ),
  op(
    "-",
    SingleType(QuantityType),
    SingleType(DecimalType),
    SingleType(QuantityType),
  ),
  op(
    "-",
    SingleType(QuantityType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op("-", SingleType(DateType), SingleType(QuantityType), SingleType(DateType)),
  op(
    "-",
    SingleType(DateTimeType),
    SingleType(QuantityType),
    SingleType(DateTimeType),
  ),
  op("-", SingleType(TimeType), SingleType(QuantityType), SingleType(TimeType)),

  // Arithmetic: *
  op(
    "*",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "*",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "*",
    SingleType(IntegerType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "*",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "*",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "*",
    SingleType(DecimalType),
    SingleType(QuantityType),
    SingleType(QuantityType),
  ),
  op(
    "*",
    SingleType(QuantityType),
    SingleType(IntegerType),
    SingleType(QuantityType),
  ),
  op(
    "*",
    SingleType(QuantityType),
    SingleType(DecimalType),
    SingleType(QuantityType),
  ),

  // Arithmetic: /
  op(
    "/",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(IntegerType),
    SingleType(QuantityType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(DecimalType),
    SingleType(QuantityType),
    SingleType(DecimalType),
  ),
  op(
    "/",
    SingleType(QuantityType),
    SingleType(IntegerType),
    SingleType(QuantityType),
  ),
  op(
    "/",
    SingleType(QuantityType),
    SingleType(DecimalType),
    SingleType(QuantityType),
  ),
  op(
    "/",
    SingleType(QuantityType),
    SingleType(QuantityType),
    SingleType(DecimalType),
  ),

  // Arithmetic: mod
  op(
    "mod",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "mod",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),
  op(
    "mod",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(DecimalType),
  ),
  op(
    "mod",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(DecimalType),
  ),

  // Arithmetic: div
  op(
    "div",
    SingleType(IntegerType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "div",
    SingleType(IntegerType),
    SingleType(DecimalType),
    SingleType(IntegerType),
  ),
  op(
    "div",
    SingleType(DecimalType),
    SingleType(IntegerType),
    SingleType(IntegerType),
  ),
  op(
    "div",
    SingleType(DecimalType),
    SingleType(DecimalType),
    SingleType(IntegerType),
  ),

  // Equality and comparison (generic)
  op("=", Generic("T"), Generic("T"), BooleanType),
  op("!=", Generic("T"), Generic("T"), BooleanType),
  op("~", Generic("T"), Generic("T"), BooleanType),
  op("!~", Generic("T"), Generic("T"), BooleanType),
  op("<", Generic("T"), Generic("T"), BooleanType),
  op("<=", Generic("T"), Generic("T"), BooleanType),
  op(">", Generic("T"), Generic("T"), BooleanType),
  op(">=", Generic("T"), Generic("T"), BooleanType),

  // Membership
  op("in", SingleType(Generic("T")), Generic("T"), BooleanType),
  op("contains", Generic("T"), SingleType(Generic("T")), BooleanType),

  // Logical
  op("and", SingleType(BooleanType), SingleType(BooleanType), BooleanType),
  op("or", SingleType(BooleanType), SingleType(BooleanType), BooleanType),
  op("xor", SingleType(BooleanType), SingleType(BooleanType), BooleanType),
  op("implies", SingleType(BooleanType), SingleType(BooleanType), BooleanType),

  // Union
  op("|", Generic("A"), Generic("B"), ({ A, B }) => {
    if (deepEqual(A, B)) return A;

    const promoted = promote(A, B);
    if (promoted) return promoted;

    return normalizeChoice(ChoiceType([A, B]));
  }),

  op("is", Generic("T"), TypeType(Generic("X")), BooleanType),

  op("as", Generic("T"), TypeType(Generic("X")), ({ X }) =>
    normalizeChoice(ChoiceType([X])),
  ),
];

export function resolveOperator(name, left, right) {
  for (const def of operatorMetadata) {
    if (def.name !== name) continue;

    const b1 = matchTypePattern(def.args[0].type, left);
    const b2 = matchTypePattern(def.args[1].type, right);
    if (!b1 || !b2) continue;

    const bindings = mergeBindings(b1 ?? {}, b2 ?? {});
    if (!bindings) continue;

    // Always wrap operator result — FHIRPath operators always return collections
    return def.returnType({
      left,
      right,
      ...bindings,
    });
  }

  return InvalidType(`No matching overload for operator "${name}"`);
}

export function suggestOperatorsForLeftType(leftType) {
  return operatorMetadata.filter((def) => {
    const bindings = matchTypePattern(def.args[0].type, leftType);
    return !!bindings;
  });
}

export function suggestRightTypesForOperator(name, leftType) {
  const suggestions = [];

  for (const def of operatorMetadata) {
    if (def.name !== name) continue;

    const bindings = matchTypePattern(def.args[0].type, leftType);
    if (!bindings) continue;

    // Fill in bindings into right-hand type
    const rightPattern = def.args[1].type;
    const resolvedRight = substituteBindings(rightPattern, bindings);

    suggestions.push(resolvedRight);
  }

  return suggestions;
}

export const operatorGroups = {
  "Math Operators": ["+", "-", "*", "/", "mod", "div"],
  "Comparison Operators": ["=", "!=", "<", ">", "<=", ">=", "~", "!~"],
  "Logical Operators": ["and", "or", "xor", "implies"],
  "Collection Operators": ["in", "contains", "&", "|"],
  "Type Operators": ["is", "as"],
};
export const operatorNames = {
  "+": "Plus",
  "-": "Minus",
  "*": "Multiply",
  "/": "Divide",
  mod: "Modulo",
  div: "Integer divide",
  "=": "Equals",
  "!=": "Not equals",
  "<": "Less than",
  ">": "Greater than",
  "<=": "Less than or equal to",
  ">=": "Greater than or equal to",
  "~": "Equivalent",
  "!~": "Not equivalent",
  and: "And",
  or: "Or",
  xor: "Xor",
  implies: "Implies",
  in: "In",
  contains: "Contains",
  "&": "Concatenate",
  "|": "Union",
  is: "Is type",
  as: "As type",
};

// console.log(
//   "suggestRightTypesForOperator",
//   suggestRightTypesForOperator(
//     "",
//     CollectionType({ type: "PrimitiveCanonical" })
//   )
// );

// console.log(
//   resolveOperator("=", PrimitiveStringType, StringType),
// );
