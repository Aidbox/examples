import { FhirType, typePrimitiveMap } from "@utils/fhir.js";
import {
  ChoiceType,
  Generic,
  InvalidType,
  LambdaType,
  SingleType,
} from "@utils/type.js";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  StringType,
  TimeType,
} from "./type";

export function stringifyType(t) {
  if (!t || typeof t !== "object") return String(t);

  switch (t.type) {
    case SingleType.type:
      return `Single<${stringifyType(t.ofType)}>`;
    case Generic.type:
      return `${t.name}`;
    case LambdaType.type:
      return `Lambda<${stringifyType(t.contextType)} => ${stringifyType(
        t.returnType,
      )}>`;
    case ChoiceType.type:
      return t.options.map(stringifyType).join(" | ");
    case InvalidType.type:
      return `Invalid${t.error ? ` (${t.error})` : ""}`;
    case FhirType.type:
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

const stringifyNumberToken = (token) => token.value || 0;

const stringifyStringToken = (token) => `'${token.value}'`;

const stringifyBooleanToken = (token) => token.value;

const stringifyDateToken = (token) => `@${token.value}`;

const stringifyDateTimeToken = (token) => `@${token.value}`;

const stringifyTimeToken = (token) => `@T${token.value}`;

const stringifyQuantityToken = (token) => {
  if (token.value && typeof token.value === "object") {
    const { value, unit } = token.value;
    return `${value || 0} '${unit || ""}'`;
  }
  return "0 ''";
};

export const stringifyTypeToken = (token) => {
  if (
    token.value.type === IntegerType.type ||
    token.value.type === DecimalType.type ||
    token.value.type === StringType.type ||
    token.value.type === BooleanType.type ||
    token.value.type === DateType.type ||
    token.value.type === DateTimeType.type ||
    token.value.type === TimeType.type
  ) {
    return token.value.type;
  } else if (typePrimitiveMap[token.value.type]) {
    return typePrimitiveMap[token.value.type];
  } else if (token.value.type === FhirType.type) {
    return token.value.schemaReference.join(".");
  }
};

const stringifyIndexToken = (token) => `[${token.value || 0}]`;

const stringifyOperatorToken = (token) => {
  if (token.value === "=") {
    return " = ";
  } else if (token.value === "&") {
    return " & ";
  } else if (token.value === "is" || token.value === "as") {
    return ` ${token.value} `;
  }
  return ` ${token.value} `;
};

const stringifyVariableToken = (token) => `%${token.value}`;

const stringifyFieldToken = (token, { first }) =>
  `${first ? "" : "."}${token.value}`;

const stringifyAnswerToken = (token, { first, questionnaireItems }) => {
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

const stringifyFunctionToken = (token, { first, ...context }) => {
  const args = token.args
    ? token.args.map((arg) => stringifyProgram(arg, context)).join(", ")
    : "";
  return `${first ? "" : "."}${token.value}(${args})`;
};

const tokenStringifiers = {
  number: stringifyNumberToken,
  string: stringifyStringToken,
  boolean: stringifyBooleanToken,
  date: stringifyDateToken,
  datetime: stringifyDateTimeToken,
  time: stringifyTimeToken,
  quantity: stringifyQuantityToken,
  type: stringifyTypeToken,
  index: stringifyIndexToken,
  operator: stringifyOperatorToken,
  variable: stringifyVariableToken,
  field: stringifyFieldToken,
  function: stringifyFunctionToken,
  answer: stringifyAnswerToken,
};

export const stringifyExpression = (expression, context) => {
  let result = "";

  for (let i = 0; i < expression.length; i++) {
    const token = expression[i];
    const stringifier = tokenStringifiers[token.type];
    if (stringifier) {
      result += stringifier(token, {
        ...context,
        first: i === 0 || expression[i - 1].type === "operator",
      });
    }
  }
  return result.trim();
};

export const stringifyBinding = (binding, context) => {
  return `defineVariable('${binding.name}'${
    binding.expression.length > 0
      ? `, ${stringifyExpression(binding.expression, context)}`
      : ""
  })`;
};

export const stringifyProgram = (program, context) => {
  let result = stringifyExpression(program.expression, context);

  if (program.bindings.length > 0) {
    result = `${program.bindings
      .map((binding) => stringifyBinding(binding, context))
      .join(".\n")}.\nselect(${result})`;
  }

  return result;
};
