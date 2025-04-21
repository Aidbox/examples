import {
  IAnswerToken,
  IBooleanToken,
  IDateTimeToken,
  IDateToken,
  IFieldToken,
  IFunctionToken,
  IIndexToken,
  ILocalBinding,
  INumberToken,
  IOperatorToken,
  IProgram,
  IQuantityToken,
  IStringToken,
  ITimeToken,
  IToken,
  IType,
  ITypeToken,
  IVariableToken,
  TokenType,
  TypeName,
} from "@/types/internal";
import { typePrimitiveMap } from "@/utils/fhir";
import { QuestionnaireItemRegistry } from "@/utils/questionnaire";

export function stringifyType(t: IType): string {
  switch (t.type) {
    case TypeName.Single:
      return `Single<${stringifyType(t.ofType)}>`;
    case TypeName.Generic:
      return `${t.name}`;
    case TypeName.Lambda:
      return `Lambda<${stringifyType(t.contextType)} => ${stringifyType(
        t.returnType,
      )}>`;
    case TypeName.Choice:
      return t.options.map(stringifyType).join(" | ");
    case TypeName.Invalid:
      return `Invalid${t.error ? ` (${t.error})` : ""}`;
    case TypeName.FhirType:
      return `${t.schemaReference[0]}${t.schemaReference
        .slice(1)
        .map((field) => `["${field}"]`)
        .join("")}`;
    default:
      if (typePrimitiveMap[t.type]) {
        return `Primitive<${typePrimitiveMap[t.type]}>`;
      }
      return t.type;
  }
}

const stringifyNumberToken = (token: INumberToken) => token.value || "0";

const stringifyStringToken = (token: IStringToken) => `'${token.value}'`;

const stringifyBooleanToken = (token: IBooleanToken) => token.value;

const stringifyDateToken = (token: IDateToken) => `@${token.value}`;

const stringifyDateTimeToken = (token: IDateTimeToken) => `@${token.value}`;

const stringifyTimeToken = (token: ITimeToken) => `@T${token.value}`;

const stringifyQuantityToken = (token: IQuantityToken) => {
  const { value, unit } = token.value;
  return `${value || 0} '${unit || ""}'`;
};

export const stringifyTypeToken = (token: ITypeToken) => {
  const primitive = typePrimitiveMap[token.value.type];

  if (primitive) {
    return primitive + "";
  } else if (token.value.type === TypeName.FhirType) {
    return token.value.schemaReference.join(".");
  }

  return token.value.type + "";
};

const stringifyIndexToken = (token: IIndexToken) => `[${token.value || 0}]`;

const stringifyOperatorToken = (token: IOperatorToken) => {
  return ` ${token.value} `;
};

const stringifyVariableToken = (token: IVariableToken) => `%${token.value}`;

interface IStringifyContext {
  first?: boolean;
  questionnaireItems: QuestionnaireItemRegistry;
}

const stringifyFieldToken = (
  token: IFieldToken,
  { first }: IStringifyContext,
) => `${first ? "" : "."}${token.value}`;

const stringifyAnswerToken = (
  token: IAnswerToken,
  { first, questionnaireItems }: IStringifyContext,
) => {
  const base = `${first ? "" : "."}repeat(item).where(linkId = '${token.value}').answer.value`;

  switch (questionnaireItems[token.value]?.item.type) {
    case "choice":
    case "open-choice":
      return `${base}.ordinal()`;
    case "quantity":
      return `${base}.value`;
    default:
      return base;
  }
};

const stringifyFunctionToken = (
  token: IFunctionToken,
  { first, ...context }: IStringifyContext,
) => {
  const args = token.args
    ? token.args
        .map((arg) => (arg ? stringifyProgram(arg, context) : "{}"))
        .join(", ")
    : "";
  return `${first ? "" : "."}${token.value}(${args})`;
};

const tokenStringifiers = {
  [TokenType.number]: stringifyNumberToken,
  [TokenType.string]: stringifyStringToken,
  [TokenType.boolean]: stringifyBooleanToken,
  [TokenType.date]: stringifyDateToken,
  [TokenType.datetime]: stringifyDateTimeToken,
  [TokenType.time]: stringifyTimeToken,
  [TokenType.quantity]: stringifyQuantityToken,
  [TokenType.type]: stringifyTypeToken,
  [TokenType.index]: stringifyIndexToken,
  [TokenType.operator]: stringifyOperatorToken,
  [TokenType.variable]: stringifyVariableToken,
  [TokenType.field]: stringifyFieldToken,
  [TokenType.function]: stringifyFunctionToken,
  [TokenType.answer]: stringifyAnswerToken,
} as const;

export const stringifyExpression = (
  expression: IToken[],
  context: IStringifyContext,
) => {
  let result = "";

  for (let i = 0; i < expression.length; i++) {
    const token = expression[i];
    const stringifier = tokenStringifiers[token.type] as (
      token: IToken,
      context: IStringifyContext,
    ) => string;
    if (stringifier) {
      result += stringifier(token, {
        ...context,
        first: i === 0 || expression[i - 1].type === "operator",
      });
    }
  }
  return result.trim();
};

export const stringifyBinding = (
  binding: ILocalBinding,
  context: IStringifyContext,
) => {
  return `defineVariable('${binding.name}'${
    binding.expression.length > 0
      ? `, ${stringifyExpression(binding.expression, context)}`
      : ""
  })`;
};

export const stringifyProgram = (
  program: IProgram,
  context: IStringifyContext,
) => {
  let result = stringifyExpression(program.expression, context);

  if (program.bindings.length > 0) {
    result = `${program.bindings
      .map((binding) => stringifyBinding(binding, context))
      .join(".\n")}.\nselect(${result})`;
  }

  return result;
};
