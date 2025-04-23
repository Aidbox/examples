export type GenericLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export type OperatorName =
  | "+"
  | "-"
  | "*"
  | "/"
  | "mod"
  | "div"
  | "="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "~"
  | "!~"
  | "and"
  | "or"
  | "xor"
  | "implies"
  | "in"
  | "contains"
  | "&"
  | "|"
  | "is"
  | "as";

export enum TokenType {
  number = "number",
  string = "string",
  boolean = "boolean",
  date = "date",
  datetime = "datetime",
  time = "time",
  quantity = "quantity",
  type = "type",
  variable = "variable",
  index = "index",
  function = "function",
  operator = "operator",
  field = "field",
  answer = "answer",
}

export interface IBaseToken {
  type: TokenType;
}

export interface INumberToken extends IBaseToken {
  type: TokenType.number;
  value: string;
}

export interface IStringToken extends IBaseToken {
  type: TokenType.string;
  value: string;
}

export interface IBooleanToken extends IBaseToken {
  type: TokenType.boolean;
  value: "true" | "false";
}

export interface IDateToken extends IBaseToken {
  type: TokenType.date;
  value: string;
}

export interface IDateTimeToken extends IBaseToken {
  type: TokenType.datetime;
  value: string;
}

export interface ITimeToken extends IBaseToken {
  type: TokenType.time;
  value: string;
}

export interface IQuantityToken extends IBaseToken {
  type: TokenType.quantity;
  value: { value: string; unit: string };
}

export interface ITypeToken extends IBaseToken {
  type: TokenType.type;
  value: Type;
}

export interface IVariableToken extends IBaseToken {
  type: TokenType.variable;
  value: string;
}

export interface IIndexToken extends IBaseToken {
  type: TokenType.index;
  value: string;
}

export interface IFunctionToken extends IBaseToken {
  type: TokenType.function;
  value: string;
  args: (IProgram | undefined)[];
}

export interface IOperatorToken extends IBaseToken {
  type: TokenType.operator;
  value: OperatorName;
}

export interface IFieldToken extends IBaseToken {
  type: TokenType.field;
  value: string;
}

export interface IAnswerToken extends IBaseToken {
  type: TokenType.answer;
  value: string;
}

export type Token =
  | INumberToken
  | IStringToken
  | IBooleanToken
  | IDateToken
  | IDateTimeToken
  | ITimeToken
  | IQuantityToken
  | ITypeToken
  | IVariableToken
  | IIndexToken
  | IFunctionToken
  | IOperatorToken
  | IFieldToken
  | IAnswerToken;

type SuggestedTokenExtra = {
  debug?: string;
  incompatible?: boolean;
  shortcut?: boolean;
  index?: number;
};

export type SuggestedToken<T extends Token = Token> = T & SuggestedTokenExtra;

export type LocalBinding = {
  id: string;
  name: string;
  expression: Token[];
};

export type ExternalBinding = {
  id: string;
  name: string;
  type: Type;
  value: FhirValue;
};

export type Binding = LocalBinding | ExternalBinding;

export interface IProgram {
  bindings: LocalBinding[];
  expression: Token[];
}

export type Context = {
  type: Type;
  value: FhirValue;
};

export enum TypeName {
  Integer = "Integer",
  Decimal = "Decimal",
  String = "String",
  Boolean = "Boolean",
  Date = "Date",
  DateTime = "DateTime",
  Time = "Time",
  Quantity = "Quantity",
  Null = "Null",
  Invalid = "Invalid",
  Type = "Type",
  Single = "Single",
  Choice = "Choice",
  Generic = "Generic",
  Lambda = "Lambda",
  PrimitiveCode = "PrimitiveCode",
  PrimitiveBoolean = "PrimitiveBoolean",
  PrimitiveString = "PrimitiveString",
  PrimitiveUri = "PrimitiveUri",
  PrimitiveDate = "PrimitiveDate",
  PrimitiveDateTime = "PrimitiveDateTime",
  PrimitiveDecimal = "PrimitiveDecimal",
  PrimitiveMarkdown = "PrimitiveMarkdown",
  PrimitiveCanonical = "PrimitiveCanonical",
  PrimitiveTime = "PrimitiveTime",
  PrimitiveId = "PrimitiveId",
  PrimitiveInteger = "PrimitiveInteger",
  PrimitivePositiveInteger = "PrimitivePositiveInteger",
  PrimitiveUnsignedInteger = "PrimitiveUnsignedInteger",
  PrimitiveInstant = "PrimitiveInstant",
  PrimitiveUuid = "PrimitiveUuid",
  PrimitiveUrl = "PrimitiveUrl",
  PrimitiveOid = "PrimitiveOid",
  PrimitiveXhtml = "PrimitiveXhtml",
  PrimitiveBase64Binary = "PrimitiveBase64Binary",
  Complex = "Complex",
}

// Type system
export interface IBaseType {
  type: TypeName;
}

export interface IIntegerType extends IBaseType {
  type: TypeName.Integer;
}

export interface IDecimalType extends IBaseType {
  type: TypeName.Decimal;
}

export interface IStringType extends IBaseType {
  type: TypeName.String;
}

export interface IBooleanType extends IBaseType {
  type: TypeName.Boolean;
}

export interface IDateType extends IBaseType {
  type: TypeName.Date;
}

export interface IDateTimeType extends IBaseType {
  type: TypeName.DateTime;
}

export interface ITimeType extends IBaseType {
  type: TypeName.Time;
}

export interface IQuantityType extends IBaseType {
  type: TypeName.Quantity;
}

export interface INullType extends IBaseType {
  type: TypeName.Null;
}

export interface IInvalidType extends IBaseType {
  type: TypeName.Invalid;
  error: string;
}

export interface ITypeType extends IBaseType {
  type: TypeName.Type;
  ofType: Type;
}

export interface ISingleType extends IBaseType {
  type: TypeName.Single;
  ofType: Type;
}

export interface IChoiceType extends IBaseType {
  type: TypeName.Choice;
  options: Type[];
}

export interface IGenericType extends IBaseType {
  type: TypeName.Generic;
  name: GenericLetter;
}

export interface ILambdaType extends IBaseType {
  type: TypeName.Lambda;
  returnType: Type;
  contextType: Type;
}

export interface IPrimitiveCodeType extends IBaseType {
  type: TypeName.PrimitiveCode;
}

export interface IPrimitiveBooleanType extends IBaseType {
  type: TypeName.PrimitiveBoolean;
}

export interface IPrimitiveStringType extends IBaseType {
  type: TypeName.PrimitiveString;
}

export interface IPrimitiveUriType extends IBaseType {
  type: TypeName.PrimitiveUri;
}

export interface IPrimitiveDateType extends IBaseType {
  type: TypeName.PrimitiveDate;
}

export interface IPrimitiveDateTimeType extends IBaseType {
  type: TypeName.PrimitiveDateTime;
}

export interface IPrimitiveDecimalType extends IBaseType {
  type: TypeName.PrimitiveDecimal;
}

export interface IPrimitiveMarkdownType extends IBaseType {
  type: TypeName.PrimitiveMarkdown;
}

export interface IPrimitiveCanonicalType extends IBaseType {
  type: TypeName.PrimitiveCanonical;
}

export interface IPrimitiveTimeType extends IBaseType {
  type: TypeName.PrimitiveTime;
}

export interface IPrimitiveIdType extends IBaseType {
  type: TypeName.PrimitiveId;
}

export interface IPrimitiveIntegerType extends IBaseType {
  type: TypeName.PrimitiveInteger;
}

export interface IPrimitivePositiveIntegerType extends IBaseType {
  type: TypeName.PrimitivePositiveInteger;
}

export interface IPrimitiveUnsignedIntegerType extends IBaseType {
  type: TypeName.PrimitiveUnsignedInteger;
}

export interface IPrimitiveInstantType extends IBaseType {
  type: TypeName.PrimitiveInstant;
}

export interface IPrimitiveUuidType extends IBaseType {
  type: TypeName.PrimitiveUuid;
}

export interface IPrimitiveUrlType extends IBaseType {
  type: TypeName.PrimitiveUrl;
}

export interface IPrimitiveOidType extends IBaseType {
  type: TypeName.PrimitiveOid;
}

export interface IPrimitiveXhtmlType extends IBaseType {
  type: TypeName.PrimitiveXhtml;
}

export interface IPrimitiveBase64BinaryType extends IBaseType {
  type: TypeName.PrimitiveBase64Binary;
}

export interface IComplexType extends IBaseType {
  type: TypeName.Complex;
  schemaReference: string[];
}

export type Type =
  | IIntegerType
  | IDecimalType
  | IStringType
  | IBooleanType
  | IDateType
  | IDateTimeType
  | ITimeType
  | IQuantityType
  | INullType
  | IInvalidType
  | ITypeType
  | ISingleType
  | IChoiceType
  | IGenericType
  | ILambdaType
  | IPrimitiveCodeType
  | IPrimitiveBooleanType
  | IPrimitiveStringType
  | IPrimitiveUriType
  | IPrimitiveDateType
  | IPrimitiveDateTimeType
  | IPrimitiveDecimalType
  | IPrimitiveMarkdownType
  | IPrimitiveCanonicalType
  | IPrimitiveTimeType
  | IPrimitiveIdType
  | IPrimitiveIntegerType
  | IPrimitivePositiveIntegerType
  | IPrimitiveUnsignedIntegerType
  | IPrimitiveInstantType
  | IPrimitiveUuidType
  | IPrimitiveUrlType
  | IPrimitiveOidType
  | IPrimitiveXhtmlType
  | IPrimitiveBase64BinaryType
  | IComplexType;

export type FunctionReturnType = (
  context: {
    input: Type;
    args: Type[];
  } & { [key in GenericLetter]?: Type },
) => Type;

// Function metadata
export type FunctionArg = {
  name: string;
  type: Type;
  optional?: boolean;
};

export type FunctionName =
  | "empty"
  | "exists"
  | "all"
  | "allTrue"
  | "anyTrue"
  | "allFalse"
  | "anyFalse"
  | "subsetOf"
  | "supersetOf"
  | "count"
  | "distinct"
  | "isDistinct"
  | "where"
  | "select"
  | "repeat"
  | "ofType"
  | "single"
  | "first"
  | "last"
  | "tail"
  | "skip"
  | "take"
  | "intersect"
  | "exclude"
  | "union"
  | "combine"
  | "iif"
  | "toBoolean"
  | "convertsToBoolean"
  | "toInteger"
  | "convertsToInteger"
  | "toDate"
  | "convertsToDate"
  | "toDateTime"
  | "convertsToDateTime"
  | "toDecimal"
  | "convertsToDecimal"
  | "toQuantity"
  | "convertsToQuantity"
  | "toString"
  | "convertsToString"
  | "toTime"
  | "convertsToTime"
  | "indexOf"
  | "substring"
  | "startsWith"
  | "endsWith"
  | "contains"
  | "upper"
  | "lower"
  | "replace"
  | "matches"
  | "replaceMatches"
  | "length"
  | "toChars"
  | "encode"
  | "decode"
  | "trim"
  | "split"
  | "join"
  | "abs"
  | "ceiling"
  | "exp"
  | "floor"
  | "ln"
  | "log"
  | "power"
  | "round"
  | "sqrt"
  | "truncate"
  | "children"
  | "descendants"
  | "trace"
  | "now"
  | "timeOfDay"
  | "today"
  | "aggregate"
  | "extension"
  | "hasValue"
  | "getValue"
  | "ordinal"
  | "sum"
  | "min"
  | "max"
  | "avg";

export type FunctionMetadata = {
  name: FunctionName;
  input: Type;
  args: FunctionArg[];
  returnType: FunctionReturnType;
};

export type OperatorReturnType = (
  context: {
    left: Type;
    right: Type;
  } & { [key in GenericLetter]?: Type },
) => Type;

export type OperatorMetadata = {
  name: OperatorName;
  left: Type;
  right: Type;
  returnType: OperatorReturnType;
};

export type TokenComponentProps = {
  bindingId: string;
  tokenIndex: number;
};

export type BindingRef = {
  focus: () => void;
  width: string | undefined;
};

export class FhirValue {
  constructor(
    public value: any,
    public origin: string | null = null,
    public error: { message: string } | null = null,
  ) {}
}

export type FhirElement = {
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
  elements?: FhirElements;
};

export type FhirElements = Record<string, FhirElement>;

export type FhirSchema = {
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
  elements?: FhirElements;
};

export type FhirNode = FhirSchema | FhirElement | FhirElements;

export type FhirRegistry = Record<string, FhirSchema>;

export type QuestionnaireItemRegistry = {
  [linkId: string]: {
    text?: string;
    type: Type;
    item: QuestionnaireItem;
  };
};

export type UnparseContext = {
  first?: boolean;
  questionnaireItems: QuestionnaireItemRegistry;
  bindings: LocalBinding[];
};

export type LezerNode = {
  type: string;
  value: string;
  children: LezerNode[];
  parent?: LezerNode;
  comment?: string;
};

export type OperatorTreeLeaf = {
  name: OperatorName;
  left: Token[] | OperatorTreeLeaf;
  right: Token[] | OperatorTreeLeaf;
};

export type QuestionnaireItem = {
  linkId: string;
  type: string;
  text?: string;
  repeats?: boolean;
  item?: QuestionnaireItem[];
  extension?: { url: string; valueCode?: string }[];
};
