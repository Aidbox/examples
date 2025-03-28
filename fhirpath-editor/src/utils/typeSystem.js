// Define our type system
export const types = {
  string: "string",
  number: "number",
  boolean: "boolean",
  Patient: "Patient",
  Questionnaire: "Questionnaire",
  Address: "Address",
};

// Type definitions for our fields
export const typeDefinitions = {
  Patient: {
    id: types.string,
    age: types.number,
    name: types.string,
    address: types.Address,
  },
  Questionnaire: {
    id: types.string,
    status: types.string,
    item: types.string,
  },
  Address: {
    state: types.string,
    city: types.string,
    zip: types.string,
    line1: types.string,
    line2: types.string,
  },
};

// Define operator type compatibility
export const operatorTypes = {
  "+": {
    [types.number]: {
      [types.number]: types.number,
      [types.string]: types.string,
    },
    [types.string]: {
      [types.string]: types.string,
      [types.number]: types.string,
    },
  },
  "-": {
    [types.number]: {
      [types.number]: types.number,
    },
  },
  "*": {
    [types.number]: {
      [types.number]: types.number,
    },
  },
  "/": {
    [types.number]: {
      [types.number]: types.number,
    },
  },
};

// Calculate the result type of an expression
export const calculateResultType = (expression, bindings) => {
  if (expression.length === 0) return null;

  if (expression.length === 1) {
    const token = expression[0];
    if (token.type === "number") return types.number;
    if (token.type === "string") return types.string;
    if (token.type === "variable") {
      const binding = bindings.find((b) => b.name === token.value);
      if (binding) {
        // If this is a global binding, return its type
        if (binding.type) return binding.type;
        // Otherwise calculate the result type of its expression
        return calculateResultType(binding.expression, bindings);
      }
    }
    if (token.type === "field") {
      const binding = bindings.find((b) => b.name === token.variable);
      if (binding && binding.type) {
        return typeDefinitions[binding.type][token.field];
      }
    }
    return null;
  }

  // For field chains (variable + field tokens)
  if (expression[0].type === "variable") {
    let currentType = null;
    let currentTypeDefinition = null;

    // Find the type of the variable
    const binding = bindings.find((b) => b.name === expression[0].value);
    if (!binding || !binding.type) return null;

    currentType = binding.type;

    // Process each field in the chain
    for (let i = 1; i < expression.length; i++) {
      const token = expression[i];
      if (token.type !== "field") return null; // Only field tokens allowed in chain

      // Get the field type from current type definition
      currentTypeDefinition = typeDefinitions[currentType];
      if (!currentTypeDefinition) return null;

      // Get the type of this field
      currentType = currentTypeDefinition[token.field];
      if (!currentType) return null;
    }

    return currentType;
  }

  // For expressions with operators
  if (expression.length === 3 && expression[1].type === "operator") {
    const left = expression[0];
    const op = expression[1];
    const right = expression[2];

    const leftType = calculateResultType([left], bindings);
    const rightType = calculateResultType([right], bindings);

    if (!leftType || !rightType) return null;

    return operatorTypes[op.value]?.[leftType]?.[rightType] || null;
  }

  return null;
};

// Filter variables for compatibility when suggesting
export const filterCompatibleVariables = (
  bindings,
  currentExpression,
) => {
  if (currentExpression.length === 0) return bindings;

  // If we have an operator and left operand
  if (
    (currentExpression.length === 3 || currentExpression.length === 2) &&
    currentExpression[1].type === "operator"
  ) {
    const leftOperand = currentExpression[0];
    const leftType = calculateResultType([leftOperand], bindings);
    const operator = currentExpression[1].value;

    return bindings.filter((binding) => {
      const rightType =
        binding.type || calculateResultType(binding.expression, bindings);
      return operatorTypes[operator]?.[leftType]?.[rightType] !== undefined;
    });
  }

  return bindings;
};

// Suggest next tokens based on current expression
export const suggestNextTokens = (expression, bindings) => {
  // if the expression is empty, suggest number and variable
  if (expression.length === 0) {
    return ["number", "string", "variable"];
  }

  const firstTokenType = calculateResultType([expression[0]], bindings);

  if (expression.length === 1) {
    if (firstTokenType === types.number || firstTokenType === types.string) {
      return ["operator"];
    }
  }

  const lastToken = expression[expression.length - 1];
  const hasOperator = expression.some((token) => token.type === "operator");

  // Check if we're in field chain mode
  const isFieldChain =
    expression[0]?.type === "variable" &&
    expression.slice(1).every((token) => token.type === "field");

  // For field chains, we can only add more fields if the current field's type is composite
  // AND we don't have an operator already (to prevent field chains as operands)
  if (isFieldChain && !hasOperator) {
    // Get the current result type of the chain
    const resultType = calculateResultType(expression, bindings);

    // Check if the result type is a composite type with fields
    if (resultType && typeDefinitions[resultType]) {
      // Return each available field as a separate option
      return Object.keys(typeDefinitions[resultType]).map(field => ({
        type: "field",
        field,
        label: field
      }));
    }
    return []; // No more fields can be added
  }

  // If we already have 3 tokens (operand, operator, operand), don't suggest more
  if (expression.length >= 3 && hasOperator) {
    return [];
  }

  // if last token is an operator, suggest only number and simple variables (not field chains)
  if (lastToken.type === "operator") {
    console.log({ firstTokenType, rightType: operatorTypes[lastToken.value][firstTokenType], operatorTypes});
    return Object.keys(operatorTypes[lastToken.value][firstTokenType] || {}).concat(["variable"]);
  }

  // if last token is a variable and no operator exists yet, suggest operator or field
  if (lastToken.type === "variable" && !hasOperator) {
    const binding = bindings.find((b) => b.name === lastToken.value);
    if (binding?.fields && binding?.type) {
      // Return operator and each available field as separate options
      return [
        "operator",
        ...Object.keys(typeDefinitions[binding.type]).map(field => ({
          type: "field",
          field,
          label: field
        }))
      ];
    }
    return ["operator"];
  }

  // if last token is a field, don't suggest operator (to prevent field chains as operands)
  if (lastToken.type === "field") {
    return [];
  }

  // if last token is a number, string or variable and no operator exists yet, suggest operator
  if (
    (lastToken.type === "number" ||
      lastToken.type === "string" ||
      lastToken.type === "variable") &&
    !hasOperator
  ) {
    return ["operator"];
  }

  return [];
}; 