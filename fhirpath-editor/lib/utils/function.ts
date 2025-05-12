import {
  AnyType,
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  Generic,
  IntegerType,
  InvalidType,
  LambdaType,
  matchTypePattern,
  mergeBindings,
  normalizeChoice,
  NullType,
  primitiveTypeMap,
  QuantityType,
  SingleType,
  StringType,
  substituteBindings,
  TimeType,
  TypeType,
  unwrapSingle,
  stringifyType,
} from "./type";
import {
  FunctionArg,
  FunctionMetadata,
  FunctionName,
  FunctionReturnType,
  Type,
  TypeName,
} from "../types/internal";
import { assertDefined } from "./misc";

function fn(
  name: FunctionName,
  input: Type,
  args: FunctionArg[],
  returnType: Type | FunctionReturnType,
): FunctionMetadata {
  return {
    name,
    input,
    args,
    returnType:
      typeof returnType === "function" ? returnType : () => returnType,
  };
}

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
} as Record<string, FunctionName[]>;

export const functionMetadata: FunctionMetadata[] = [
  // Section 5.1: Existence
  fn("empty", Generic("T"), [], BooleanType),
  fn(
    "exists",
    Generic("T"),
    [
      {
        name: "criteria",
        type: LambdaType(BooleanType, Generic("T")),
        optional: true,
      },
    ],
    BooleanType,
  ),
  fn(
    "all",
    Generic("T"),
    [{ name: "criteria", type: LambdaType(BooleanType, Generic("T")) }],
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
  fn("distinct", Generic("T"), [], ({ T }) => {
    assertDefined(T);
    return T;
  }),
  fn("isDistinct", Generic("T"), [], BooleanType),

  // Section 5.2: Filtering and projection
  fn(
    "where",
    Generic("T"),
    [
      {
        name: "criteria",
        type: LambdaType(BooleanType, SingleType(Generic("T"))),
      },
    ],
    ({ T }) => {
      assertDefined(T);
      return T;
    },
  ),
  fn(
    "select",
    Generic("T"),
    [
      {
        name: "projection",
        type: LambdaType(Generic("R"), SingleType(Generic("T"))),
      },
    ],
    ({ R }) => {
      assertDefined(R);
      return R;
    },
  ),
  fn(
    "repeat",
    Generic("T"),
    [
      {
        name: "projection",
        type: LambdaType(Generic("R"), SingleType(Generic("T"))),
      },
    ],
    ({ R }) => {
      assertDefined(R);
      return unwrapSingle(R);
    },
  ),
  fn(
    "ofType",
    Generic("T"),
    [{ name: "type", type: TypeType(Generic("X")) }],
    ({ X }) => {
      assertDefined(X);
      return normalizeChoice(ChoiceType([X]));
    },
  ),

  // Section 5.3: Subsetting
  fn("single", Generic("T"), [], ({ T }) => {
    assertDefined(T);
    return SingleType(T);
  }),
  fn("first", Generic("T"), [], ({ T }) => {
    assertDefined(T);
    return SingleType(T);
  }),
  fn("last", Generic("T"), [], ({ T }) => {
    assertDefined(T);
    return SingleType(T);
  }),
  fn("tail", Generic("T"), [], ({ T }) => {
    assertDefined(T);
    return T;
  }),
  fn("skip", Generic("T"), [{ name: "num", type: IntegerType }], ({ T }) => {
    assertDefined(T);
    return T;
  }),
  fn("take", Generic("T"), [{ name: "num", type: IntegerType }], ({ T }) => {
    assertDefined(T);
    return T;
  }),
  fn(
    "intersect",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    ({ T }) => {
      assertDefined(T);
      return T;
    },
  ),
  fn(
    "exclude",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    ({ T }) => {
      assertDefined(T);
      return T;
    },
  ),

  // Section 5.4: Combining
  fn(
    "union",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    ({ T }) => {
      assertDefined(T);
      return unwrapSingle(T);
    },
  ),
  fn(
    "combine",
    Generic("T"),
    [{ name: "other", type: Generic("T") }],
    ({ T }) => {
      assertDefined(T);
      return unwrapSingle(T);
    },
  ),

  // Section 5.5: Conversion
  fn(
    "iif",
    Generic("I"),
    [
      {
        name: "condition",
        type: LambdaType(Generic("C"), SingleType(Generic("I"))),
      },
      {
        name: "then",
        type: LambdaType(Generic("T"), SingleType(Generic("I"))),
      },
      {
        name: "else",
        type: LambdaType(Generic("F"), SingleType(Generic("I"))),
        optional: true,
      },
    ],
    ({ T, F, args: [, , elseArg] }) => {
      assertDefined(T);
      assertDefined(F);
      if (elseArg?.type !== NullType.type) {
        return ChoiceType([T, F]);
      } else {
        return T;
      }
    },
  ),
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
  fn("children", Generic("T"), [], AnyType),
  fn("descendants", Generic("T"), [], AnyType),

  // Section 5.9: Utility Functions
  fn(
    "trace",
    Generic("T"),
    [
      { name: "name", type: StringType },
      {
        name: "projection",
        type: LambdaType(Generic("R"), Generic("T")),
        optional: true,
      },
    ],
    ({ T }) => {
      assertDefined(T);
      return T;
    },
  ),
  fn("now", Generic("T"), [], DateTimeType),
  fn("timeOfDay", Generic("T"), [], TimeType),
  fn("today", Generic("T"), [], DateType),

  // Section 7: Aggregates
  fn(
    "aggregate",
    Generic("T"),
    [
      { name: "aggregator", type: LambdaType(Generic("R"), Generic("T")) },
      { name: "init", type: Generic("R"), optional: true },
    ],
    ({ R }) => {
      assertDefined(R);
      return R;
    },
  ),

  // FHIR Extensions
  fn(
    "extension",
    Generic("T"),
    [{ name: "url", type: StringType }],
    ({ T }) => {
      assertDefined(T);
      return T;
    },
  ),
  fn("hasValue", Generic("T"), [], BooleanType),
  fn("getValue", Generic("T"), [], ChoiceType(Object.values(primitiveTypeMap))),

  // SDC Extensions
  fn("ordinal", Generic("T"), [], DecimalType),
  fn(
    "sum",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ({ input }) => SingleType(input),
  ),
  fn(
    "min",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ({ input }) => SingleType(input),
  ),
  fn(
    "max",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ({ input }) => SingleType(input),
  ),
  fn(
    "avg",
    ChoiceType([DecimalType, IntegerType, QuantityType]),
    [],
    ({ input }) => SingleType(input),
  ),
];

export function resolveFunctionCall(
  name: string,
  inputType: Type,
  contextType: Type,
  getArgumentType: (index: number, contextType: Type) => Type | undefined,
): Type {
  const meta = functionMetadata.find((f) => f.name === name);
  if (!meta) return InvalidType(`Unknown function "${name}"`);

  let bindings = matchTypePattern(meta.input, inputType);
  if (!bindings) {
    return InvalidType(
      `Input type mismatch for ${name}. Expected ${stringifyType(
        meta.input,
      )}, got ${stringifyType(inputType)}`,
    );
  }

  const resolvedArgumentTypes: Type[] = [];
  for (let i = 0; i < meta.args.length; i++) {
    const argDef = meta.args[i];
    const concreteExpectedPatternForArg = substituteBindings(
      argDef.type,
      bindings,
    );

    let actualTypeToMatchArgument: Type;
    const isExpectedLambda =
      concreteExpectedPatternForArg?.type === TypeName.Lambda;

    // Determine the context ($this) for the argument's core expression
    const argContextType = isExpectedLambda
      ? concreteExpectedPatternForArg.contextType // For lambda body
      : contextType; // For regular expression arguments, $this is from the outer scope

    const argExprBodyType = getArgumentType(i, argContextType);

    if (!argExprBodyType) {
      if (argDef.optional) {
        actualTypeToMatchArgument = NullType;
      } else {
        actualTypeToMatchArgument = InvalidType(
          `Missing required argument "${argDef.name}" (at index ${i}) for function "${name}"`,
        );
      }
    } else if (argExprBodyType.type === TypeName.Invalid) {
      actualTypeToMatchArgument = argExprBodyType; // Propagate error from argument expression evaluation
    } else {
      // If a lambda was expected, wrap the evaluated body type. Otherwise, use the type directly.
      if (isExpectedLambda) {
        actualTypeToMatchArgument = LambdaType(
          argExprBodyType,
          concreteExpectedPatternForArg.contextType, // Use the contextType from the *expected* pattern
        );
      } else {
        actualTypeToMatchArgument = argExprBodyType;
      }
    }

    resolvedArgumentTypes.push(actualTypeToMatchArgument);

    if (actualTypeToMatchArgument.type === TypeName.Invalid) {
      // The error message from InvalidType should be descriptive enough.
      // console.debug(`Bailing due to invalid required arg: ${stringifyType(actualTypeToMatchArgument)}`);
      return actualTypeToMatchArgument;
    }

    // Now, match the fully formed actual argument type against the original pattern
    // to capture/verify any generics in the argument's definition (like 'R' in a projection).
    const newBindings = matchTypePattern(
      argDef.type, // Original pattern from metadata, e.g., LambdaType(Generic("R"), ...)
      actualTypeToMatchArgument,
      bindings,
    );

    if (!newBindings) {
      return InvalidType(
        `Argument type mismatch for "${
          argDef.name
        }" (at index ${i}) of function "${name}". Expected compatible with ${stringifyType(
          substituteBindings(argDef.type, bindings), // Show expected with current bindings
        )}, got ${stringifyType(actualTypeToMatchArgument)}`,
      );
    }

    const mergedBindings = mergeBindings(bindings, newBindings);
    if (!mergedBindings) {
      return InvalidType(
        `Binding conflict for argument ${argDef.name} at index ${i} in function "${name}"`,
      );
    }
    bindings = mergedBindings;
  }

  return meta.returnType({
    input: inputType,
    args: resolvedArgumentTypes, // These are the fully formed types of the arguments
    ...bindings,
  });
}

export function getArgumentContextType(
  index: number,
  name: string,
  inputType: Type,
  contextType: Type,
  getArgumentType: (index: number, contextType: Type) => Type | undefined,
): Type {
  let capturedContext: Type | undefined = undefined;

  resolveFunctionCall(
    name,
    inputType,
    contextType,
    (argIndex: number, argContextType: Type) => {
      if (argIndex === index) {
        capturedContext = argContextType;
        return undefined;
      }

      return argIndex < index
        ? getArgumentType(argIndex, argContextType)
        : undefined;
    },
  );

  return capturedContext || InvalidType("Failed to capture argument context");
}

export function suggestFunctionsForInputType(input: Type) {
  return functionMetadata.filter(
    (meta) => !!matchTypePattern(meta.input, input),
  );
}
