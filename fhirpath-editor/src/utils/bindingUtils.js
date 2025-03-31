// Find all variables referenced in a binding's expression
export const findReferencedVariables = (binding) => {
  return binding.expression
    .filter((token) => token.type === "variable")
    .map((token) => token.value);
};

// Check if a binding can be moved to a target position
export const canMoveBinding = (bindings, sourceIndex, targetIndex) => {
  if (sourceIndex === targetIndex) return true;

  const binding = bindings[sourceIndex];

  // Moving up
  if (targetIndex < sourceIndex) {
    const referencedVars = findReferencedVariables(binding);

    for (let i = targetIndex; i < sourceIndex; i++) {
      if (referencedVars.includes(bindings[i].name)) {
        return false;
      }
    }
    return true;
  }

  // Moving down
  if (targetIndex > sourceIndex) {
    const bindingName = binding.name;

    for (let i = sourceIndex + 1; i <= targetIndex; i++) {
      const referencingVars = findReferencedVariables(bindings[i]);
      if (referencingVars.includes(bindingName)) {
        return false;
      }
    }
    return true;
  }

  return true;
};

export const generateBindingId = () => 
  `binding-${Math.random().toString(36).substr(2, 9)}`; 


// Global bindings available to all expressions
export const globalBindings = [
  {
    name: "questionnaire",
    expression: [],
    fields: ["id", "status", "item"],
    type: "Questionnaire",
  },
  {
    name: "patient",
    expression: [],
    fields: ["id", "age", "name"],
    type: "Patient",
  },
];


export const sampleBindings = [
  {
    name: "myString",
    expression: [{ type: "string", value: "Hello, world!" }],
  },
  {
    name: "var1",
    expression: [
      {
        type: "number",
        value: "1",
      },
      {
        type: "operator",
        value: "+",
      },
      {
        type: "number",
        value: "2",
      },
    ],
  },
  {
    name: "var2",
    expression: [
      {
        type: "number",
        value: "1",
      },
      {
        type: "operator",
        value: "+",
      },
      {
        type: "variable",
        value: "var1",
      },
    ],
  },
  {
    name: "var3",
    expression: [
      { type: "variable", value: "patient" },
      { type: "field", value: "name" },
    ],
  },
];

export const sampleExpression = [
  { type: "number", value: "1" },
  { type: "operator", value: "+" },
  { type: "variable", value: "var3" },
]