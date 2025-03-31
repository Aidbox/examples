// Type definitions for our fields
export const typeDefinitions = {
  Patient: {
    id: "string",
    age: "number",
    name: "string",
    address: "Address",
  },
  Questionnaire: {
    id: "string",
    status: "string",
    item: "string",
  },
  Address: {
    state: "string",
    city: "string",
    zip: "string",
    line1: "string",
    line2: "string",
  },
};

// Define operator type compatibility
export const operatorTypes = {
  "+": {
    ["number"]: {
      ["number"]: "number",
      ["string"]: "string",
    },
    ["string"]: {
      ["string"]: "string",
      ["number"]: "string",
    },
  },
  "-": {
    ["number"]: {
      ["number"]: "number",
    },
  },
  "*": {
    ["number"]: {
      ["number"]: "number",
    },
  },
  "/": {
    ["number"]: {
      ["number"]: "number",
    },
  },
};

function isChainingExpression(expression) {
  if (expression.length >= 1) {
    if (expression[0].type === "variable") {
      if (expression.slice(1).every((token) => token.type === "field")) {
        return true;
      }
    }
  }
  return false;
}

function isOperatorExpression(expression) {
  if (expression.length === 3 && expression[1].type === "operator") {
    return true;
  }
  return false;
}

// Calculate the result type of an expression
export const getExpressionType = (expression, bindings) => {
  if (expression.length === 0) return;

  if (expression.length === 1) {
    const token = expression[0];
    if (token.type === "number") return "number";
    if (token.type === "string") return "string";
    if (token.type === "variable") {
      const binding = bindings.find((b) => b.name === token.value);
      if (!binding) return;
      // If this is a global binding, return its type
      if (binding.type) return binding.type;
      // Otherwise calculate the result type of its expression
      return getExpressionType(binding.expression, bindings);
    }
    return;
  }

  // For field chains (variable + field tokens)
  if (isChainingExpression(expression)) {
    let currentType = null;
    let [variable, ...fields] = expression;

    const binding = bindings.find((b) => b.name === variable.value);
    if (!binding) return;
    
    currentType = binding.type || getExpressionType(binding.expression, bindings);

    while (fields.length > 0 && currentType) {
      const field = fields.shift();
      currentType = typeDefinitions[currentType]?.[field.value];
    }

    return currentType;
  }

  // For expressions with operators
  if (isOperatorExpression(expression)) {
    const [left, op, right] = expression;

    const leftType = getExpressionType([left], bindings);
    const rightType = getExpressionType([right], bindings);

    if (!leftType || !rightType) return;

    return operatorTypes[op.value]?.[leftType]?.[rightType] || null;
  }

  return;
};

// Filter variables for compatibility when suggesting
export const findCompatibleVariables = (
  bindings,
  currentExpression,
) => {
  if (currentExpression.length === 0) return bindings;

  // If we have an operator and left operand
  if (
    (currentExpression.length === 3 || currentExpression.length === 2) &&
    currentExpression[1].type === "operator"
  ) {
    const [left, op] = currentExpression;
    const leftType = getExpressionType([left], bindings);

    return bindings.filter((binding) => 
       operatorTypes[op.value]?.[leftType]?.[binding.type || getExpressionType(binding.expression, bindings)]
    );
  }

  return bindings;
};

// Suggest next tokens based on current expression
export const suggestNextToken = (expression, bindings) => {
  // if the expression is empty, suggest number and variable
  if (expression.length === 0) {
    return [{ type: "number" }, { type: "string" }, { type: "variable" }];
  }

  const firstTokenType = getExpressionType([expression[0]], bindings);

  if (expression.length === 1) {
    if (Object.entries(operatorTypes).some(([op, types]) => types[firstTokenType])) {
      return [{ type: "operator" }];
    }
  }

  if (expression.length === 2 && expression[1].type === "operator") {
    const leftType = getExpressionType([expression[0]], bindings);
    return Object.keys(operatorTypes[expression[1].value]?.[leftType] || {}).concat(["variable"]).map(type => ({ type }));
  }

  if (isChainingExpression(expression)) {
    const resultType = getExpressionType(expression, bindings);
    return Object.keys(typeDefinitions[resultType] || {}).map(field => ({ type: "field", value: field }));
  }

  return [];
}; 