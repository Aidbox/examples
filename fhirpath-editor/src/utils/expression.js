import {
  suggestOperatorsForLeftType,
  suggestRightTypesForOperator,
  resolveOperator,
} from "./operator.js";
import {
  IntegerType,
  DecimalType,
  StringType,
  BooleanType,
  DateType,
  DateTimeType,
  TimeType,
  QuantityType,
  TypeType,
  InvalidType,
  matchTypePattern,
  SingleType,
  unwrapSingle,
} from "./type.js";
import { distinct } from "./misc.js";
import { getFields } from "./fhir-type.js";
import "./function.js";
import {
  resolveFunctionCall,
  suggestFunctionsForInputType,
} from "./function.js";

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
  `binding-${Math.random().toString(36).substring(2, 9)}`;

function isChainingExpression(expression) {
  if (expression.length >= 1) {
    if (expression[0].type === "variable") {
      if (
        expression
          .slice(1)
          .every(
            (token) =>
              token.type === "field" ||
              token.type === "index" ||
              token.type === "function",
          )
      ) {
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

// Calculate the result type of expression
export const getExpressionType = (expression, bindings) => {
  if (expression.length === 0) return InvalidType("Empty expression");

  if (expression.length === 1) {
    const token = expression[0];
    if (token.type === "number") {
      // Determine if the number is an integer or decimal based on its value
      return token.value.includes(".")
        ? SingleType(DecimalType)
        : SingleType(IntegerType);
    }
    if (token.type === "string") return SingleType(StringType);
    if (token.type === "boolean") return SingleType(BooleanType);
    if (token.type === "date") return SingleType(DateType);
    if (token.type === "datetime") return SingleType(DateTimeType);
    if (token.type === "time") return SingleType(TimeType);
    if (token.type === "quantity") return SingleType(QuantityType);
    if (token.type === "type") return TypeType(token.value); // Return the actual type value
    if (token.type === "variable") {
      const binding = bindings.find((b) => b.name === token.value);
      if (!binding) return InvalidType("Unknown variable");
      // If this is a global binding, return its type
      if (binding.type) return binding.type;
      // Otherwise calculate the result type of its expression
      return getExpressionType(binding.expression, bindings);
    }
    return InvalidType("Unknown token");
  }

  // For field chains (variable + field tokens)
  if (isChainingExpression(expression)) {
    let [variable, ...tokens] = expression;

    const binding = bindings.find((b) => b.name === variable.value);
    if (!binding) return InvalidType("Unknown variable");

    let currentType =
      binding.type || getExpressionType(binding.expression, bindings);

    while (tokens.length > 0 && currentType.type !== "Invalid") {
      const token = tokens.shift();

      // Skip index tokens - they don't change the type
      if (token.type === "index") continue;
      else if (token.type === "function") {
        currentType = resolveFunctionCall({
          name: token.value,
          input: currentType,
          args: token.args?.map((arg) =>
            getExpressionType(arg.expression, [...bindings, arg.bindings]),
          ),
        });
      } else {
        const availableFields = getFields(currentType);
        currentType =
          availableFields[token.value] || InvalidType("Unknown field");
      }
    }

    return currentType;
  }

  // For expressions with operators
  if (isOperatorExpression(expression)) {
    const [left, op, right] = expression;

    const leftType = getExpressionType([left], bindings);
    const rightType = getExpressionType([right], bindings);

    if (leftType.type === "Invalid" || rightType.type === "Invalid")
      return InvalidType("Invalid argument types");

    return resolveOperator({
      op: op.value,
      left: leftType,
      right: rightType,
    });
  }

  return InvalidType("Unknown expression");
};

// Filter variables for compatibility when suggesting
export const findCompatibleVariables = (bindings, expression) => {
  if (expression.length === 0) return bindings;

  // If we have an operator and left operand
  if (
    (expression.length === 3 || expression.length === 2) &&
    expression[1].type === "operator"
  ) {
    const [left, op] = expression;
    const leftType = getExpressionType([left], bindings);

    if (leftType.type === "Invalid") return [];
    const rightTypes = suggestRightTypesForOperator(op.value, leftType);

    return bindings.filter((binding) => {
      const bindingType =
        binding.type || getExpressionType(binding.expression, bindings);
      return rightTypes.some((rightType) =>
        matchTypePattern(rightType, bindingType),
      );
    });
  }

  return bindings;
};

export const findCompatibleOperators = (bindings, expression) => {
  if (expression.length !== 1) return [];

  const leftType = getExpressionType([expression[0]], bindings);
  return suggestOperatorsForLeftType(leftType);
};

const typeName2tokenType = {
  [IntegerType.type]: "number",
  [DecimalType.type]: "number",
  [StringType.type]: "string",
  [BooleanType.type]: "boolean",
  [DateType.type]: "date",
  [DateTimeType.type]: "datetime",
  [TimeType.type]: "time",
  [QuantityType.type]: "quantity",
  [TypeType.type]: "type",
};

// Suggest next tokens based on current expression
export const suggestNextToken = (expression, bindings) => {
  // if the expression is empty, suggest all primitive types and variable
  if (expression.length === 0) {
    return [
      { type: "number" },
      { type: "string" },
      { type: "boolean" },
      { type: "date" },
      { type: "datetime" },
      { type: "time" },
      { type: "quantity" },
      { type: "type" },
      { type: "variable" },
    ];
  }

  if (expression.length === 2 && expression[1].type === "operator") {
    const operator = expression[1].value;

    const leftType = getExpressionType([expression[0]], bindings);
    const rightTypes = suggestRightTypesForOperator(operator, leftType);

    return distinct(
      rightTypes
        .map((rightType) => typeName2tokenType[unwrapSingle(rightType).type])
        .concat(["variable"])
        .filter((type) => type),
    ).map((type) => ({ type }));
  }

  const result = [];

  if (expression.length === 1) {
    const firstTokenType = getExpressionType([expression[0]], bindings);

    if (suggestOperatorsForLeftType(firstTokenType).length > 0) {
      result.push({ type: "operator" });
    }
  }

  if (isChainingExpression(expression)) {
    const type = getExpressionType(expression, bindings);
    result.push(
      { type: "index" },
      ...Object.keys(getFields(type)).map((field) => ({
        type: "field",
        value: field,
      })),
      ...suggestFunctionsForInputType(type).map((name) => ({
        type: "function",
        value: name,
      })),
    );
  }

  return result;
};

// console.log(suggestFunctionsForInputType(CollectionType(StringType)));
