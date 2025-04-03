import {
  Generic,
  BooleanType,
  IntegerType,
  DecimalType,
  QuantityType,
  StringType,
  DateType,
  DateTimeType,
  TimeType,
  InvalidType,
  TypeType,
  CollectionType,
  ChoiceType,
  substituteBindings,
  matchTypePattern,
  normalizeChoice,
  wrapCollection,
  unwrapCollection,
  deepEqual,
  promote,
  mergeBindings,
} from "./type";

// Helper to define individual overload
const op = (symbol, left, right, result) => ({
  op: symbol,
  args: [
    { name: "left", type: left },
    { name: "right", type: right },
  ],
  returnType: typeof result === "function" ? result : () => result,
});

export const operatorMetadata = [
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
  op("in", Generic("T"), CollectionType(Generic("T")), BooleanType),
  op("contains", CollectionType(Generic("T")), Generic("T"), BooleanType),

  // Logical
  op("and", BooleanType, BooleanType, BooleanType),
  op("or", BooleanType, BooleanType, BooleanType),
  op("xor", BooleanType, BooleanType, BooleanType),
  op("implies", BooleanType, BooleanType, BooleanType),

  // String concat
  op("&", StringType, StringType, StringType),

  // Arithmetic: +
  op("+", IntegerType, IntegerType, IntegerType),
  op("+", IntegerType, DecimalType, DecimalType),
  op("+", IntegerType, QuantityType, QuantityType),
  op("+", DecimalType, IntegerType, DecimalType),
  op("+", DecimalType, DecimalType, DecimalType),
  op("+", DecimalType, QuantityType, QuantityType),
  op("+", QuantityType, IntegerType, QuantityType),
  op("+", QuantityType, DecimalType, QuantityType),
  op("+", QuantityType, QuantityType, QuantityType),
  op("+", StringType, StringType, StringType),
  op("+", DateType, QuantityType, DateType),
  op("+", DateTimeType, QuantityType, DateTimeType),
  op("+", TimeType, QuantityType, TimeType),

  // Arithmetic: -
  op("-", IntegerType, IntegerType, IntegerType),
  op("-", IntegerType, DecimalType, DecimalType),
  op("-", IntegerType, QuantityType, QuantityType),
  op("-", DecimalType, IntegerType, DecimalType),
  op("-", DecimalType, DecimalType, DecimalType),
  op("-", DecimalType, QuantityType, QuantityType),
  op("-", QuantityType, IntegerType, QuantityType),
  op("-", QuantityType, DecimalType, QuantityType),
  op("-", QuantityType, QuantityType, QuantityType),
  op("-", DateType, QuantityType, DateType),
  op("-", DateTimeType, QuantityType, DateTimeType),
  op("-", TimeType, QuantityType, TimeType),

  // Arithmetic: *
  op("*", IntegerType, IntegerType, IntegerType),
  op("*", IntegerType, DecimalType, DecimalType),
  op("*", IntegerType, QuantityType, QuantityType),
  op("*", DecimalType, IntegerType, DecimalType),
  op("*", DecimalType, DecimalType, DecimalType),
  op("*", DecimalType, QuantityType, QuantityType),
  op("*", QuantityType, IntegerType, QuantityType),
  op("*", QuantityType, DecimalType, QuantityType),

  // Arithmetic: /
  op("/", IntegerType, IntegerType, DecimalType),
  op("/", IntegerType, DecimalType, DecimalType),
  op("/", IntegerType, QuantityType, DecimalType),
  op("/", DecimalType, IntegerType, DecimalType),
  op("/", DecimalType, DecimalType, DecimalType),
  op("/", DecimalType, QuantityType, DecimalType),
  op("/", QuantityType, IntegerType, QuantityType),
  op("/", QuantityType, DecimalType, QuantityType),
  op("/", QuantityType, QuantityType, DecimalType),

  // Arithmetic: mod
  op("mod", IntegerType, IntegerType, IntegerType),
  op("mod", IntegerType, DecimalType, DecimalType),
  op("mod", DecimalType, IntegerType, DecimalType),
  op("mod", DecimalType, DecimalType, DecimalType),

  // Arithmetic: div
  op("div", IntegerType, IntegerType, IntegerType),
  op("div", IntegerType, DecimalType, IntegerType),
  op("div", DecimalType, IntegerType, IntegerType),
  op("div", DecimalType, DecimalType, IntegerType),

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

export function resolveOperator({ op, left, right }) {
  const rawLeft = unwrapCollection(left);
  const rawRight = unwrapCollection(right);

  for (const def of operatorMetadata) {
    if (def.op !== op) continue;

    const b1 = matchTypePattern(def.args[0].type, rawLeft);
    const b2 = matchTypePattern(def.args[1].type, rawRight);
    if (!b1 || !b2) continue;

    const bindings = mergeBindings(b1 ?? {}, b2 ?? {});
    if (!bindings) continue;

    const resultType = def.returnType({
      left: rawLeft,
      right: rawRight,
      ...bindings,
    });

    // Always wrap operator result — FHIRPath operators always return collections
    return wrapCollection(resultType);
  }

  return wrapCollection(
    InvalidType(`No matching overload for operator "${op}"`),
  );
}

export function suggestOperatorsForLeftType(leftType) {
  const rawLeft = unwrapCollection(leftType);

  return operatorMetadata
    .filter((def) => {
      const bindings = matchTypePattern(def.args[0].type, rawLeft);
      return !!bindings;
    })
    .map((def) => def.op);
}

export function suggestRightTypesForOperator(op, leftType) {
  const rawLeft = unwrapCollection(leftType);

  const suggestions = [];

  for (const def of operatorMetadata) {
    if (def.op !== op) continue;

    const bindings = matchTypePattern(def.args[0].type, rawLeft);
    if (!bindings) continue;

    // Fill in bindings into right-hand type
    const rightPattern = def.args[1].type;
    const resolvedRight = substituteBindings(rightPattern, bindings);

    suggestions.push(resolvedRight);
  }

  return suggestions;
}

// console.log(
//   stringifyType(
//     resolveOperator({
//       op: "|",
//       left: CollectionType({ type: "Patient" }),
//       right: CollectionType({ type: "Practitioner" }),
//     })
//   )
// );
//
// console.log(
//   stringifyType(
//     resolveOperator({
//       op: "as",
//       left: CollectionType(StringType),
//       right: TypeType(QuantityType),
//     })
//   )
// );
//
// console.log(
//   "suggestRightTypesForOperator",
//   suggestRightTypesForOperator("|", CollectionType(StringType))
// );
