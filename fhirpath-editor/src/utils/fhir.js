const expressionToFhirPath = (expression) => {
  return expression.map((token) => {
    if (token.type === 'number') {
      return token.value || 0;
    } else if (token.type === 'string') {
      return `"${token.value}"`;
    } else if (token.type === 'operator') {
      return ` ${token.value} `;
    } else if (token.type === 'variable') {
      return `%${token.value}`;
    } else if (token.type === 'field') {
      return `.${token.field}`;
    }
  }).join("");
};

const bindingToFhirPath = (binding) => {
  return `defineVariable(${binding.name}${binding.expression.length > 0 ? `, ${expressionToFhirPath(binding.expression)}` : ""})`;
};

const appToFhirPath = (app) => {
    let result = expressionToFhirPath(app.expression);
    
    if (app.bindings.length > 0) {
        result = `${app.bindings.map(bindingToFhirPath).join("\n.")}\n.select(${result})`;
    }

    return result;
};


export default appToFhirPath;