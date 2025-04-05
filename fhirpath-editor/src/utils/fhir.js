import { highlightCode, classHighlighter } from "@lezer/highlight";
import { parser } from "lezer-fhirpath";

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

export const appToFhirPath = (app) => {
  let result = expressionToFhirPath(app.expression);

  if (app.bindings.length > 0) {
    result = `${app.bindings
      .map(bindingToFhirPath)
      .join(".\n")}.\nselect(${result})`;
  }

  return result;
};

export function highlightFhirPath(code) {
  let result = document.createElement("pre");
  let style = document.createElement("style");

  style.innerHTML = `
    .tok-string { color: #a11; }
    .tok-number { color: #192b8c; }
    .tok-operator, .tok-keyword { color: #4c0793; } /* Keywords like 'is', 'as', 'and' */
    .tok-variableName { color: #675900; } /* Variables like %patient */
    .tok-literal { color: #fa1c9c; } /* Date/Time/Quantity literals */
    .tok-functionName { color: green; } /* Function names like exists() */
    .tok-propertyName { color: #192b8c; font-style: italic; } /* Field access like .name */
    .tok-constantName, .tok-bool { color: #975305; } /* Booleans true/false */
    .tok-punctuation { color: #555; } /* Brackets, parens, commas */
    .tok-typeName { color: #192b8c; } /* Type specifiers like Patient */
    .tok-invalid { color: red; text-decoration: underline; } /* For errors */
  `;

  result.appendChild(style);

  function emit(text, classes) {
    let node = document.createTextNode(text);
    if (classes) {
      let span = document.createElement("span");
      span.appendChild(node);
      span.className = classes;
      node = span;
    }
    result.appendChild(node);
  }

  function emitBreak() {
    result.appendChild(document.createTextNode("\n"));
  }

  highlightCode(code, parser.parse(code), classHighlighter, emit, emitBreak);
  return result.outerHTML;
}
