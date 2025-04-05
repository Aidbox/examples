import {
  BooleanType,
  CollectionType,
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
  TypeType,
  InvalidType,
  stringifyType,
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

/*
FHIRPath Functions

empty() : Boolean
exists([criteria : expression]) : Boolean
all(criteria : expression) : Boolean
allTrue() : Boolean
anyTrue() : Boolean
allFalse() : Boolean
anyFalse() : Boolean
subsetOf(other : collection) : Boolean
supersetOf(other : collection) : Boolean
count() : Integer
distinct() : collection
isDistinct() : Boolean
where(criteria : expression) : collection
select(projection: expression) : collection
repeat(projection: expression) : collection
ofType(type : type specifier) : collection
single() : collection
first() : collection
last() : collection
tail() : collection
skip(num : Integer) : collection
take(num : Integer) : collection
intersect(other: collection) : collection
exclude(other: collection) : collection
union(other : collection)
combine(other : collection) : collection
iif(criterion: expression, true-result: collection [, otherwise-result: collection]) : collection
toBoolean() : Boolean
convertsToBoolean() : Boolean
toInteger() : Integer
convertsToInteger() : Boolean
toDate() : Date
convertsToDate() : Boolean
toDateTime() : DateTime
convertsToDateTime() : Boolean
toDecimal() : Decimal
convertsToDecimal() : Boolean
toQuantity([unit : String]) : Quantity
convertsToQuantity([unit : String]) : Boolean
toString() : String
convertsToString() : String
toTime() : Time
convertsToTime() : Boolean
indexOf(substring : String) : Integer
substring(start : Integer [, length : Integer]) : String
startsWith(prefix : String) : Boolean
endsWith(suffix : String) : Boolean
contains(substring : String) : Boolean
upper() : String
lower() : String
replace(pattern : String, substitution : String) : String
matches(regex : String) : Boolean
replaceMatches(regex : String, substitution: String) : String
length() : Integer
toChars() : collection
encode(format : String) : String
decode(format : String) : String
escape(target : String) : String
unescape(target : String) : String
trim() : String
split(separator: String) : collection
join([separator: String]) : String
abs() : Integer | Decimal | Quantity
ceiling() : Integer
exp() : Decimal
floor() : Integer
ln() : Decimal
log(base : Decimal) : Decimal
power(exponent : Integer | Decimal) : Integer | Decimal
round([precision : Integer]) : Decimal
sqrt() : Decimal
truncate() : Integer
children() : collection
descendants() : collection
trace(name : String [, projection: Expression]) : collection
now() : DateTime
timeOfDay() : Time
today() : Date
defineVariable(name : string [, expr: expression]]) : collection
is(type : type specifier)
as(type : type specifier)
aggregate(aggregator : expression [, init : value]) : value
type() : SimpleTypeInfo | ClassInfo | ListTypeInfo
extension(url : string) : collection
hasValue() : Boolean
getValue() : System.[type]
resolve() : collection
elementDefinition() : collection
slice(structure : string, name : string) : collection
checkModifiers(modifier : string) : collection
conformsTo(structure : string) : Boolean
memberOf(valueset : string) : Boolean
subsumes(code : Coding | CodeableConcept) : Boolean
subsumedBy(code: Coding | CodeableConcept) : Boolean
htmlChecks : Boolean
lowBoundary : T
highBoundary : T
comparable(quantity) : boolean
ordinal() : decimal
answers() : QuestionnaireItem#Answer
sum() : decimal | integer | quantity
min() : decimal | integer | quantity
max() : decimal | integer | quantity
avg() : decimal | integer | quantity
*/

export const functionMetadata = [
  // Section 5.1: Existence
  fn("empty", CollectionType(Generic("T")), [], BooleanType),
  fn(
    "exists",
    CollectionType(Generic("T")),
    [{ name: "criteria", type: LambdaType(BooleanType), optional: true }],
    BooleanType
  ),
  fn(
    "all",
    CollectionType(Generic("T")),
    [{ name: "criteria", type: LambdaType(BooleanType) }],
    BooleanType
  ),
  fn("allTrue", CollectionType(BooleanType), [], BooleanType),
  fn("anyTrue", CollectionType(BooleanType), [], BooleanType),
  fn("allFalse", CollectionType(BooleanType), [], BooleanType),
  fn("anyFalse", CollectionType(BooleanType), [], BooleanType),
  fn(
    "subsetOf",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    BooleanType
  ),
  fn(
    "supersetOf",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    BooleanType
  ),
  fn("count", CollectionType(Generic("T")), [], IntegerType),
  fn(
    "distinct",
    CollectionType(Generic("T")),
    [],
    CollectionType(Generic("T"))
  ),
  fn("isDistinct", CollectionType(Generic("T")), [], BooleanType),

  // Section 5.2: Filtering and projection
  fn(
    "where",
    CollectionType(Generic("T")),
    [{ name: "criteria", type: LambdaType(BooleanType) }],
    CollectionType(Generic("T"))
  ),
  fn(
    "select",
    CollectionType(Generic("T")),
    [{ name: "projection", type: LambdaType(Generic("R")) }],
    ({ R }) => CollectionType(R)
  ),
  fn(
    "repeat",
    CollectionType(Generic("T")),
    [{ name: "projection", type: LambdaType(Generic("R")) }],
    ({ R }) => CollectionType(R)
  ),
  fn(
    "ofType",
    CollectionType(Generic("T")),
    [{ name: "type", type: "TypeSpecifier" }],
    CollectionType(Generic("T"))
  ),

  // Section 5.3: Subsetting
  fn("single", CollectionType(Generic("T")), [], Generic("T")),
  fn("first", CollectionType(Generic("T")), [], Generic("T")),
  fn("last", CollectionType(Generic("T")), [], Generic("T")),
  fn("tail", CollectionType(Generic("T")), [], CollectionType(Generic("T"))),
  fn(
    "skip",
    CollectionType(Generic("T")),
    [{ name: "num", type: IntegerType }],
    CollectionType(Generic("T"))
  ),
  fn(
    "take",
    CollectionType(Generic("T")),
    [{ name: "num", type: IntegerType }],
    CollectionType(Generic("T"))
  ),
  fn(
    "intersect",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    CollectionType(Generic("T"))
  ),
  fn(
    "exclude",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    CollectionType(Generic("T"))
  ),

  // Section 5.4: Combining
  fn(
    "union",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    CollectionType(Generic("T"))
  ),
  fn(
    "combine",
    CollectionType(Generic("T")),
    [{ name: "other", type: CollectionType(Generic("T")) }],
    CollectionType(Generic("T"))
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
    QuantityType
  ),
  fn(
    "convertsToQuantity",
    Generic("T"),
    [{ name: "unit", type: StringType, optional: true }],
    BooleanType
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
    IntegerType
  ),
  fn(
    "substring",
    StringType,
    [
      { name: "start", type: IntegerType },
      { name: "length", type: IntegerType, optional: true },
    ],
    StringType
  ),
  fn(
    "startsWith",
    StringType,
    [{ name: "prefix", type: StringType }],
    BooleanType
  ),
  fn(
    "endsWith",
    StringType,
    [{ name: "suffix", type: StringType }],
    BooleanType
  ),
  fn(
    "contains",
    StringType,
    [{ name: "substring", type: StringType }],
    BooleanType
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
    StringType
  ),
  fn("matches", StringType, [{ name: "regex", type: StringType }], BooleanType),
  fn(
    "replaceMatches",
    StringType,
    [
      { name: "regex", type: StringType },
      { name: "substitution", type: StringType },
    ],
    StringType
  ),
  fn("length", StringType, [], IntegerType),
  fn("toChars", StringType, [], CollectionType(StringType)),

  // Section 5.7: Additional String Functions
  fn("encode", StringType, [{ name: "format", type: StringType }], StringType),
  fn("decode", StringType, [{ name: "format", type: StringType }], StringType),
  fn("trim", StringType, [], StringType),
  fn(
    "split",
    StringType,
    [{ name: "separator", type: StringType }],
    CollectionType(StringType)
  ),
  fn(
    "join",
    CollectionType(StringType),
    [{ name: "separator", type: StringType, optional: true }],
    StringType
  ),

  // Section 5.7: Math
  fn(
    "abs",
    ChoiceType([IntegerType, DecimalType, QuantityType]),
    [],
    ChoiceType([IntegerType, DecimalType, QuantityType])
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
    DecimalType
  ),
  fn(
    "round",
    DecimalType,
    [{ name: "precision", type: IntegerType, optional: true }],
    DecimalType
  ),
  fn("sqrt", DecimalType, [], DecimalType),
  fn("truncate", DecimalType, [], IntegerType),

  // Section 5.8: Tree Navigation
  fn("children", Generic("T"), [], CollectionType(Generic("T"))),
  fn("descendants", Generic("T"), [], CollectionType(Generic("T"))),

  // Section 5.9: Utility Functions
  fn(
    "trace",
    CollectionType(Generic("T")),
    [
      { name: "name", type: StringType },
      { name: "projection", type: LambdaType(Generic("T")), optional: true },
    ],
    CollectionType(Generic("T"))
  ),
  fn("now", Generic("T"), [], DateTimeType),
  fn("timeOfDay", Generic("T"), [], TimeType),
  fn("today", Generic("T"), [], DateType),

  // Section 5.10: Define Variable
  fn(
    "defineVariable",
    CollectionType(Generic("T")),
    [
      { name: "name", type: StringType },
      { name: "expr", type: LambdaType(Generic("T")), optional: true },
    ],
    CollectionType(Generic("T"))
  ),

  // Section 7: Aggregates
  fn(
    "aggregate",
    CollectionType(Generic("T")),
    [
      { name: "aggregator", type: LambdaType(Generic("R")) },
      { name: "init", type: Generic("R"), optional: true },
    ],
    ({ R }) => R
  ),

  // FHIR Extensions
  fn(
    "extension",
    Generic("T"),
    [{ name: "url", type: StringType }],
    CollectionType(Generic("T"))
  ),
  fn("hasValue", Generic("T"), [], BooleanType),
  fn("getValue", Generic("T"), [], Generic("T")),

  // SDC Extensions
  fn("ordinal", Generic("T"), [], DecimalType),
  fn(
    "sum",
    CollectionType(ChoiceType([DecimalType, IntegerType, QuantityType])),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType])
  ),
  fn(
    "min",
    CollectionType(ChoiceType([DecimalType, IntegerType, QuantityType])),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType])
  ),
  fn(
    "max",
    CollectionType(ChoiceType([DecimalType, IntegerType, QuantityType])),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType])
  ),
  fn(
    "avg",
    CollectionType(ChoiceType([DecimalType, IntegerType, QuantityType])),
    [],
    ChoiceType([DecimalType, IntegerType, QuantityType])
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
            expected.type
          )}, got ${stringifyType(actual)}`
        );
      bindings = mergeBindings(bindings, b);
    } else if (expected.optional) {
      resolvedArgs.push({ type: "Null" });
    } else {
      return InvalidType(`Missing required argument: ${expected.name}`);
    }
  }

  return fn.returnType({ input, args, ...bindings });
}

export function suggestFunctionsForInputType(inputType) {
  return functionMetadata
    .filter((fn) => !!matchTypePattern(fn.input, inputType))
    .map((fn) => fn.name);
}
