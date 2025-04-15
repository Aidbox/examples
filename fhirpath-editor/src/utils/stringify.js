import { FhirType, typePrimitiveMap } from "@utils/fhir-type.js";
import {
  ChoiceType,
  Generic,
  InvalidType,
  LambdaType,
  SingleType,
} from "@utils/type.js";

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

export const stringifyExpression = (expression) => {
  return expression
    .map((token, index) => {
      if (token.type === "number") {
        return token.value || 0;
      } else if (token.type === "string") {
        return `'${token.value}'`;
      } else if (token.type === "boolean") {
        return token.value;
      } else if (token.type === "date") {
        return `@${token.value}`;
      } else if (token.type === "datetime") {
        return `@${token.value}`;
      } else if (token.type === "time") {
        return `@T${token.value}`;
      } else if (token.type === "quantity") {
        if (token.value && typeof token.value === "object") {
          const { value, unit } = token.value;
          return `${value || 0} '${unit || ""}'`;
        } else {
          return "0 ''";
        }
      } else if (token.type === "type") {
        // Handle type tokens
        return token.value;
      } else if (token.type === "index") {
        // Handle index tokens - don't add a space before the brackets
        return `[${token.value || 0}]`;
      } else if (token.type === "operator") {
        if (token.value === "=") {
          return " = ";
        } else if (token.value === "&") {
          return " & ";
        } else if (token.value === "is" || token.value === "as") {
          // Special handling for type operators
          return ` ${token.value} `;
        } else {
          return ` ${token.value} `;
        }
      } else if (token.type === "variable") {
        return `%${token.value}`;
      } else if (token.type === "field") {
        return `${index === 0 ? "" : "."}${token.value}`;
      } else if (token.type === "function") {
        const args = token.args
          ? token.args.map((arg) => stringifyProgram(arg)).join(", ")
          : "";
        return `${index === 0 ? "" : "."}${token.value}(${args})`;
      } else {
        return "";
      }
    })
    .join("");
};

export const stringifyBinding = (binding) => {
  return `defineVariable(${binding.name}${
    binding.expression.length > 0
      ? `, ${stringifyExpression(binding.expression)}`
      : ""
  })`;
};

export const stringifyProgram = (program) => {
  let result = stringifyExpression(program.expression);

  if (program.bindings.length > 0) {
    result = `${program.bindings
      .map(stringifyBinding)
      .join(".\n")}.\nselect(${result})`;
  }

  return result;
};
