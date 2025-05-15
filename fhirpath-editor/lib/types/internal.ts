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

export enum TokenGroup {
  literal = "literal",
  variable = "variable",
  index = "index",
  function = "function",
  operator = "operator",
  field = "field",
  answer = "answer",
}

export enum TokenKind {
  null = "null",
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
  kind: TokenKind;
}

export interface INullToken extends IBaseToken {
  kind: TokenKind.null;
}

export interface INumberToken extends IBaseToken {
  kind: TokenKind.number;
  value: string;
}

export interface IStringToken extends IBaseToken {
  kind: TokenKind.string;
  value: string;
}

export interface IBooleanToken extends IBaseToken {
  kind: TokenKind.boolean;
  value: "true" | "false";
}

export interface IDateToken extends IBaseToken {
  kind: TokenKind.date;
  value: string;
}

export interface IDateTimeToken extends IBaseToken {
  kind: TokenKind.datetime;
  value: string;
}

export interface ITimeToken extends IBaseToken {
  kind: TokenKind.time;
  value: string;
}

export interface IQuantityToken extends IBaseToken {
  kind: TokenKind.quantity;
  value: { value: string; unit: string };
}

export interface ITypeToken extends IBaseToken {
  kind: TokenKind.type;
  value: Type;
}

export interface IVariableToken extends IBaseToken {
  kind: TokenKind.variable;
  value: string;
  special?: true;
}

export interface IIndexToken extends IBaseToken {
  kind: TokenKind.index;
  value: string;
}

export interface IFunctionToken extends IBaseToken {
  kind: TokenKind.function;
  value: string;
  args: (IProgram | undefined)[];
}

export interface IOperatorToken extends IBaseToken {
  kind: TokenKind.operator;
  value: OperatorName;
}

export interface IFieldToken extends IBaseToken {
  kind: TokenKind.field;
  value: string;
}

export interface IAnswerToken extends IBaseToken {
  kind: TokenKind.answer;
  value: string;
}

export type Token =
  | INullToken
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
  Unknown = "Unknown",
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
  name: TypeName;
}

export interface IIntegerType extends IBaseType {
  name: TypeName.Integer;
}

export interface IDecimalType extends IBaseType {
  name: TypeName.Decimal;
}

export interface IStringType extends IBaseType {
  name: TypeName.String;
}

export interface IBooleanType extends IBaseType {
  name: TypeName.Boolean;
}

export interface IDateType extends IBaseType {
  name: TypeName.Date;
}

export interface IDateTimeType extends IBaseType {
  name: TypeName.DateTime;
}

export interface ITimeType extends IBaseType {
  name: TypeName.Time;
}

export interface IQuantityType extends IBaseType {
  name: TypeName.Quantity;
}

export interface INullType extends IBaseType {
  name: TypeName.Null;
}

export interface IUnknownType extends IBaseType {
  name: TypeName.Unknown;
}

export interface IInvalidType extends IBaseType {
  name: TypeName.Invalid;
  error: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface ITypeType extends IBaseType {
  name: TypeName.Type;
  ofType: Type;
}

export interface ISingleType extends IBaseType {
  name: TypeName.Single;
  ofType: Type;
}

export interface IChoiceType extends IBaseType {
  name: TypeName.Choice;
  options: Type[];
}

export interface IGenericType extends IBaseType {
  name: TypeName.Generic;
  letter: GenericLetter;
}

export interface ILambdaType extends IBaseType {
  name: TypeName.Lambda;
  returnType: Type;
  contextType: Type;
}

export interface IPrimitiveCodeType extends IBaseType {
  name: TypeName.PrimitiveCode;
}

export interface IPrimitiveBooleanType extends IBaseType {
  name: TypeName.PrimitiveBoolean;
}

export interface IPrimitiveStringType extends IBaseType {
  name: TypeName.PrimitiveString;
}

export interface IPrimitiveUriType extends IBaseType {
  name: TypeName.PrimitiveUri;
}

export interface IPrimitiveDateType extends IBaseType {
  name: TypeName.PrimitiveDate;
}

export interface IPrimitiveDateTimeType extends IBaseType {
  name: TypeName.PrimitiveDateTime;
}

export interface IPrimitiveDecimalType extends IBaseType {
  name: TypeName.PrimitiveDecimal;
}

export interface IPrimitiveMarkdownType extends IBaseType {
  name: TypeName.PrimitiveMarkdown;
}

export interface IPrimitiveCanonicalType extends IBaseType {
  name: TypeName.PrimitiveCanonical;
}

export interface IPrimitiveTimeType extends IBaseType {
  name: TypeName.PrimitiveTime;
}

export interface IPrimitiveIdType extends IBaseType {
  name: TypeName.PrimitiveId;
}

export interface IPrimitiveIntegerType extends IBaseType {
  name: TypeName.PrimitiveInteger;
}

export interface IPrimitivePositiveIntegerType extends IBaseType {
  name: TypeName.PrimitivePositiveInteger;
}

export interface IPrimitiveUnsignedIntegerType extends IBaseType {
  name: TypeName.PrimitiveUnsignedInteger;
}

export interface IPrimitiveInstantType extends IBaseType {
  name: TypeName.PrimitiveInstant;
}

export interface IPrimitiveUuidType extends IBaseType {
  name: TypeName.PrimitiveUuid;
}

export interface IPrimitiveUrlType extends IBaseType {
  name: TypeName.PrimitiveUrl;
}

export interface IPrimitiveOidType extends IBaseType {
  name: TypeName.PrimitiveOid;
}

export interface IPrimitiveXhtmlType extends IBaseType {
  name: TypeName.PrimitiveXhtml;
}

export interface IPrimitiveBase64BinaryType extends IBaseType {
  name: TypeName.PrimitiveBase64Binary;
}

export interface IComplexType extends IBaseType {
  name: TypeName.Complex;
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
  | IUnknownType
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

  valueAt(index: number) {
    if (this.error) {
      return this;
    } else {
      if (
        index > 0 &&
        (!Array.isArray(this.value) || this.value.length - 1 < index)
      ) {
        return new FhirValue(
          null,
          this.origin,
          new Error(`Index out of bounds: ${index}`),
        );
      }
      return new FhirValue(
        Array.isArray(this.value) ? this.value[index] : this.value,
        this.origin,
        null,
      );
    }
  }
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
  mockSpecials?: boolean;
  questionnaireItems: QuestionnaireItemRegistry;
  bindingsOrder: Record<LocalBinding["id"], number>;
};

export type LezerTerminalNode<T = string> = {
  type: string;
  value: T;
  comment?: string;
};

export type LezerNonTerminalNode<T = string> = {
  type: string;
  children: Array<LezerNode<T>>;
  comment?: string;
};

export type LezerNode<T = string> =
  | LezerTerminalNode<T>
  | LezerNonTerminalNode<T>;

export type OperatorTreeLeaf = {
  name: OperatorName;
  left: Token[] | OperatorTreeLeaf;
  right: Token[] | OperatorTreeLeaf;

  leftPosition: {
    start: number;
    end: number;
  };
  rightPosition: {
    start: number;
    end: number;
  };
};

export type QuestionnaireItem = {
  linkId: string;
  type: string;
  text?: string;
  repeats?: boolean;
  item?: QuestionnaireItem[];
  extension?: { url: string; valueCode?: string }[];
};

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
