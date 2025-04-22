// Basic type definitions
import { OperatorName } from "@/utils/operator.ts";
import { FunctionName } from "@/utils/function.ts";

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

export type INumberToken = {
  type: TokenType.number;
  value: string;
};

export type IStringToken = {
  type: TokenType.string;
  value: string;
};

export type IBooleanToken = {
  type: TokenType.boolean;
  value: "true" | "false";
};

export type IDateToken = {
  type: TokenType.date;
  value: string;
};

export type IDateTimeToken = {
  type: TokenType.datetime;
  value: string;
};

export type ITimeToken = {
  type: TokenType.time;
  value: string;
};

export type IQuantityToken = {
  type: TokenType.quantity;
  value: { value: string; unit: string };
};

export type ITypeToken = {
  type: TokenType.type;
  value: IType;
};

export type IVariableToken = {
  type: TokenType.variable;
  value: string;
};

export type IIndexToken = {
  type: TokenType.index;
  value: string;
};

export type IFunctionToken = {
  type: TokenType.function;
  value: string;
  args: (IProgram | undefined)[];
};

export type IOperatorToken = {
  type: TokenType.operator;
  value: OperatorName;
};

export type IFieldToken = {
  type: TokenType.field;
  value: string;
};

export type IAnswerToken = {
  type: TokenType.answer;
  value: string;
};

export type IToken =
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

export type ISuggestedToken<T extends IToken = IToken> = T &
  SuggestedTokenExtra;

export interface ILocalBinding {
  id: string;
  name: string;
  expression: IToken[];
}

export interface IExternalBinding {
  id: string;
  name: string;
  type: IType;
  value: FhirValue;
}

export type IBinding = ILocalBinding | IExternalBinding;

export interface IProgram {
  bindings: ILocalBinding[];
  expression: IToken[];
}

export interface IContext {
  type: IType;
  value: FhirValue;
}

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
  FhirType = "FhirType",
}

// Type system
export interface IBaseType {
  type: string;
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
  ofType: IType;
}

export interface ISingleType extends IBaseType {
  type: TypeName.Single;
  ofType: IType;
}

export interface IChoiceType extends IBaseType {
  type: TypeName.Choice;
  options: IType[];
}

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

export interface IGenericType extends IBaseType {
  type: TypeName.Generic;
  name: GenericLetter;
}

export interface ILambdaType extends IBaseType {
  type: TypeName.Lambda;
  returnType: IType;
  contextType: IType;
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

export interface IFhirType extends IBaseType {
  type: TypeName.FhirType;
  schemaReference: string[];
}

export type IType =
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
  | IFhirType;

export type IFunctionReturnType = (
  context: {
    input: IType;
    args: IType[];
  } & { [key in GenericLetter]?: IType },
) => IType;

// Function metadata
export interface IFunctionArg {
  name: string;
  type: IType;
  optional?: boolean;
}

export interface IFunctionMetadata {
  name: FunctionName;
  input: IType;
  args: IFunctionArg[];
  returnType: IFunctionReturnType;
}

export type IOperatorReturnType = (
  context: {
    left: IType;
    right: IType;
  } & { [key in GenericLetter]?: IType },
) => IType;

// Operator metadata
export interface IOperatorMetadata {
  name: OperatorName;
  left: IType;
  right: IType;
  returnType: IOperatorReturnType;
}

// Questionnaire types
export interface IQuestionnaireItem {
  linkId: string;
  type: string;
  text?: string;
  answerOption?: Array<{
    valueCoding?: {
      code: string;
      display: string;
    };
  }>;
}

export interface ITokenComponentProps {
  bindingId: string | null;
  tokenIndex: number;
}

export interface IBindingRef {
  focus: () => void;
  width: string | undefined;
}

export class FhirValue {
  constructor(
    public value: any,
    public origin: string | null = null,
    public error: { message: string } | null = null,
  ) {}
}
