import {
  BooleanType,
  Generic,
  IntegerType,
  matchTypePattern,
  QuantityType,
  StringType,
  ChoiceType,
  DecimalType,
  DateType,
  DateTimeType,
  TimeType,
  InvalidType,
  stringifyType,
  mergeBindings,
} from "./type";

const LambdaType = (ofType) => ({
  type: "Lambda",
  ofType,
});

const fn = (name, input, args, returnType) => ({
  name,
  input,
  args,
  returnType: typeof returnType === "function" ? returnType : () => returnType,
});

export const category = {
  // 5.1
  Existence: [
    "empty",
    "exists",
    "all",
    "allTrue",
    "anyTrue",
    "allFalse",
    "anyFalse",
    "subsetOf",
    "supersetOf",
    "count",
    "distinct",
    "isDistinct",
  ],
  // 5.2
  "Filtering and projection": ["where", "select", "repeat", "ofType"],
  // 5.3
  Subsetting: [
    "single",
    "first",
    "last",
    "tail",
    "skip",
    "take",
    "intersect",
    "exclude",
  ],
  // 5.4
  Combining: ["union", "combine"],
  // 5.5
  Conversion: [
    "iif",
    "toBoolean",
    "convertsToBoolean",
    "toInteger",
    "convertsToInteger",
    "toDate",
    "convertsToDate",
    "toDateTime",
    "convertsToDateTime",
    "toDecimal",
    "convertsToDecimal",
    "toQuantity",
    "convertsToQuantity",
    "toString",
    "convertsToString",
    "toTime",
    "convertsToTime",
  ],
  // 5.6
  "String Manipulation": [
    "indexOf",
    "substring",
    "startsWith",
    "endsWith",
    "contains",
    "upper",
    "lower",
    "replace",
    "matches",
    "replaceMatches",
    "length",
    "toChars",
  ],
  // 5.7
  "Additional String Functions": ["encode", "decode", "trim", "split", "join"],
  // 5.7
  Math: [
    "abs",
    "ceiling",
    "exp",
    "floor",
    "ln",
    "log",
    "power",
    "round",
    "sqrt",
    "truncate",
  ],
  // 5.8
  "Tree Navigation": ["children", "descendants"],
  // 5.9
  "Utility Functions": ["trace", "now", "timeOfDay", "today"],
  // 7
  Aggregates: ["aggregate"],
  // FHIR Extensions
  "FHIR Extensions": ["extension", "hasValue", "getValue"],
  // SDC Extensions
  "SDC Extensions": ["ordinal", "sum", "min", "max", "avg"],
};

export const functionMetadata = [
  // Section 5.1: Existence
  fn("empty", Generic("T"), [], BooleanType),
  fn(
    "exists",
    Generic("T"),
    [{ name: "criteria", type: LambdaType(BooleanType), optional: true }],
    BooleanType,
  ),
  fn(
    "all",
    Generic("T"),
    [{ name: "criteria", type: LambdaType(BooleanType) }],
    BooleanType,
  ),
  fn("allTrue", BooleanType, [], BooleanType),
  fn("anyTrue", BooleanType, [], BooleanType),
  fn("allFalse", BooleanType, [], BooleanType),
  fn("anyFalse", BooleanType, [], BooleanType),
  fn(
    "subsetOf",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    BooleanType,
  ),
  fn(
    "supersetOf",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    BooleanType,
  ),
  fn("count", Generic("T"), [], IntegerType),
  fn("distinct", Generic("T"), [], Generic("T")),
  fn("isDistinct", Generic("T"), [], BooleanType),

  // Section 5.2: Filtering and projection
  fn(
    "where",
    Generic("T"),
    [{ name: "criteria", type: LambdaType(BooleanType) }],
    Generic("T"),
  ),
  fn(
    "select",
    Generic("T"),
    [{ name: "projection", type: LambdaType(Generic("R")) }],
    ({ R }) => R,
  ),
  fn(
    "repeat",
    Generic("T"),
    [{ name: "projection", type: LambdaType(Generic("R")) }],
    ({ R }) => R,
  ),
  fn(
    "ofType",
    Generic("T"),
    [{ name: "type", type: "TypeSpecifier" }],
    Generic("T"),
  ),

  // Section 5.3: Subsetting
  fn("single", Generic("T"), [], Generic("T")),
  fn("first", Generic("T"), [], Generic("T")),
  fn("last", Generic("T"), [], Generic("T")),
  fn("tail", Generic("T"), [], Generic("T")),
  fn("skip", Generic("T"), [{ name: "num", type: IntegerType }], Generic("T")),
  fn("take", Generic("T"), [{ name: "num", type: IntegerType }], Generic("T")),
  fn(
    "intersect",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    Generic("T"),
  ),
  fn(
    "exclude",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    Generic("T"),
  ),

  // Section 5.4: Combining
  fn(
    "union",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    Generic("T"),
  ),
  fn(
    "combine",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    Generic("T"),
  ),

  // Section 5.5: Conversion
  fn("toBoolean", Generic("T"), [], BooleanType),
  fn("convertsToBoolean", Generic("T"), [], BooleanType),
  fn("toInteger", Generic("T"), [], IntegerType),
  fn("convertsToInteger", Generic("T"), [], BooleanType),
  fn("toDate", Generic("T"), [], DateType),
  fn("convertsToDate", Generic("T"), [], BooleanType),
  fn("toDateTime", Generic("T"), [], DateTimeType),
  fn("convertsToDateTime", Generic("T"), [], BooleanType),
  fn("toDecimal", Generic("T"), [], DecimalType),
  fn("convertsToDecimal", Generic("T"), [], BooleanType),
  fn(
    "toQuantity",
    Generic("T"),
    [{ name: "unit", type: StringType, optional: true }],
    QuantityType,
  ),
  fn(
    "convertsToQuantity",
    Generic("T"),
    [{ name: "unit", type: StringType, optional: true }],
    BooleanType,
  ),
  fn("toString", Generic("T"), [], StringType),
  fn("convertsToString", Generic("T"), [], BooleanType),
  fn("toTime", Generic("T"), [], TimeType),
  fn("convertsToTime", Generic("T"), [], BooleanType),

  // Section 5.6: String Manipulation
  fn(
    "indexOf",
    StringType,
    [{ name: "substring", type: StringType }],
    IntegerType,
  ),
  fn(
    "substring",
    StringType,
    [
      { name: "start", type: IntegerType },
      { name: "length", type: IntegerType, optional: true },
    ],
    StringType,
  ),
  fn(
    "startsWith",
    StringType,
    [{ name: "prefix", type: StringType }],
    BooleanType,
  ),
  fn(
    "endsWith",
    StringType,
    [{ name: "suffix", type: StringType }],
    BooleanType,
  ),
  fn(
    "contains",
    StringType,
    [{ name: "substring", type: StringType }],
    BooleanType,
  ),
  fn("upper", StringType, [], StringType),
  fn("lower", StringType, [], StringType),
  fn(
    "replace",
    StringType,
    [
      { name: "pattern", type: StringType },
      { name: "substitution", type: StringType },
    ],
    StringType,
  ),
  fn("matches", StringType, [{ name: "regex", type: StringType }], BooleanType),
  fn(
    "replaceMatches",
    StringType,
    [
      { name: "regex", type: StringType },
      { name: "substitution", type: StringType },
    ],
    StringType,
  ),
  fn("length", StringType, [], IntegerType),
  fn("toChars", StringType, [], StringType),

  // Section 5.7: Additional String Functions
  fn("encode", StringType, [{ name: "format", type: StringType }], StringType),
  fn("decode", StringType, [{ name: "format", type: StringType }], StringType),
  fn("trim", StringType, [], StringType),
  fn(
    "split",
    StringType,
    [{ name: "separator", type: StringType }],
    StringType,
  ),
  fn(
    "join",
    StringType,
    [{ name: "separator", type: StringType, optional: true }],
    StringType,
  ),

  // Section 5.7: Math
  fn(
    "abs",
    ChoiceType([IntegerType, DecimalType, QuantityType]),
    [],
    ChoiceType([IntegerType, DecimalType, QuantityType]),
  ),
  fn("ceiling", DecimalType, [], IntegerType),
  fn("exp", DecimalType, [], DecimalType),
  fn("floor", DecimalType, [], IntegerType),
  fn("ln", DecimalType, [], DecimalType),
  fn("log", DecimalType, [{ name: "base", type: DecimalType }], DecimalType),
  fn(
    "power",
    DecimalType,
    [{ name: "exponent", type: ChoiceType([IntegerType, DecimalType]) }],
    DecimalType,
  ),
  fn(
    "round",
    DecimalType,
    [{ name: "precision", type: IntegerType, optional: true }],
    DecimalType,
  ),
  fn("sqrt", DecimalType, [], DecimalType),
  fn("truncate", DecimalType, [], IntegerType),

  // Section 5.8: Tree Navigation
  fn("children", Generic("T"), [], Generic("T")),
  fn("descendants", Generic("T"), [], Generic("T")),

  // Section 5.9: Utility Functions
  fn(
    "trace",
    Generic("T"),
    [
      { name: "name", type: StringType },
      { name: "projection", type: LambdaType(Generic("T")), optional: true },
    ],
    Generic("T"),
  ),
  fn("now", Generic("T"), [], DateTimeType),
  fn("timeOfDay", Generic("T"), [], TimeType),
  fn("today", Generic("T"), [], DateType),

  // Section 5.10: Define Variable
  fn(
    "defineVariable",
    Generic("T"),
    [
      { name: "name", type: StringType },
      { name: "expr", type: LambdaType(Generic("T")), optional: true },
    ],
    Generic("T"),
  ),

  // Section 7: Aggregates
  fn(
    "aggregate",
    Generic("T"),
    [
      { name: "aggregator", type: LambdaType(Generic("R")) },
      { name: "init", type: Generic("R"), optional: true },
    ],
    ({ R }) => R,
  ),

  // FHIR Extensions
  fn(
    "extension",
    Generic("T"),
    [{ name: "url", type: StringType }],
    Generic("T"),
  ),
  fn("hasValue", Generic("T"), [], BooleanType),
  fn("getValue", Generic("T"), [], Generic("T")),

  // SDC Extensions
  fn("ordinal", Generic("T"), [], DecimalType),
  fn(
    "sum",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType]),
  ),
  fn(
    "min",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType]),
  ),
  fn(
    "max",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType]),
  ),
  fn(
    "avg",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType]),
  ),
];

export function resolveFunctionCall({ name, input, args = [] }) {
  const fn = functionMetadata.find((f) => f.name === name);
  if (!fn) return InvalidType(`Function "${name}" not found`);

  let bindings = matchTypePattern(fn.input, input);
  if (!bindings) return InvalidType(`Input type does not match for "${name}"`);

  const resolvedArgs = [];

  for (let i = 0; i < (fn.args?.length || 0); i++) {
    const expected = fn.args[i];
    const actual = args[i];

    if (actual) {
      const b = matchTypePattern(expected.type, actual);
      if (!b)
        return InvalidType(
          `Argument ${expected.name} does not match. Expected ${stringifyType(
            expected.type,
          )}, got ${stringifyType(actual)}`,
        );
      bindings = mergeBindings(bindings, b);
    } else if (expected.optional) {
      resolvedArgs.push({ type: "Null" });
    } else {
      return InvalidType(`Missing required argument: ${expected.name}`);
    }
  }

  return fn.returnType({ input, args, resolvedArgs, ...bindings });
}

export function suggestFunctionsForInputType(inputType) {
  return functionMetadata
    .filter((fn) => !!matchTypePattern(fn.input, inputType))
    .map((fn) => fn.name);
}
