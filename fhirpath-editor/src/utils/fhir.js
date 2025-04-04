export const expressionToFhirPath = (expression) => {
  return expression
    .map((token) => {
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
        return `.${token.value}`;
      } else {
        return "";
      }
    })
    .join("");
};

export const bindingToFhirPath = (binding) => {
  return `defineVariable(${binding.name}${
    binding.expression.length > 0
      ? `, ${expressionToFhirPath(binding.expression)}`
      : ""
  })`;
};

const appToFhirPath = (app) => {
  let result = expressionToFhirPath(app.expression);

  if (app.bindings.length > 0) {
    result = `${app.bindings
      .map(bindingToFhirPath)
      .join("\n.")}\n.select(${result})`;
  }

  return result;
};

export default appToFhirPath;
