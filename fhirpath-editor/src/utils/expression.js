import {
  resolveOperator,
  suggestOperatorsForLeftType,
  suggestRightTypesForOperator,
} from "./operator.js";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  InvalidType,
  LambdaType,
  matchTypePattern,
  mergeBindings,
  NullType,
  QuantityType,
  SingleType,
  StringType,
  substituteBindings,
  TimeType,
  TypeType,
  unwrapSingle,
} from "./type.js";
import { distinct } from "./misc.js";
import { getFields } from "./fhir-type.js";
import "./function.js";
import {
  functionMetadata,
  suggestArgumentTypesForFunction,
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
    if (
      expression[0].type === "variable" ||
      expression[0].type === "field" ||
      expression[0].type === "function"
    ) {
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
export const getExpressionType = (expression, bindings, contextType) => {
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
      // Otherwise, calculate the result type of its expression
      return getExpressionType(binding.expression, bindings, contextType);
    }
  }

  if (isChainingExpression(expression)) {
    let tokens = [...expression];

    let currentType = contextType;
    let first = true;
    if (!tokens.length) return InvalidType("Empty expression");

    while (tokens.length > 0 && currentType?.type !== "Invalid") {
      const token = tokens.shift();

      if (first) {
        // we are at the first token
        switch (token.type) {
          case "variable":
            const binding = bindings.find((b) => b.name === token.value);
            currentType = !binding
              ? InvalidType("Unknown variable")
              : binding.type ||
                getExpressionType(binding.expression, bindings, contextType);
            first = false;
            continue; // skip the rest of the loop
          case "field":
          case "function":
            first = false;
            break; // handle the token as a regular token
          default:
            debugger;
            return InvalidType("Unexpected first token");
        }
      }

      // Skip index tokens - they don't change the type
      if (token.type === "index") {
        currentType = SingleType(currentType);
      } else if (token.type === "function") {
        const meta = functionMetadata.find((f) => f.name === token.value);
        if (!meta) return InvalidType("Unknown function");

        let bindings = matchTypePattern(meta.input, currentType);
        if (!bindings) return InvalidType("Input type mismatch");

        const result = [];
        for (let i = 0; i < meta.args.length; i++) {
          const arg = meta.args[i];
          const program = token.args?.[i];
          const expectedType = meta.args[i].type;

          if (!program) {
            if (arg.optional) {
              result.push(NullType);
              continue;
            } else {
              return InvalidType(`Missing required argument at index ${i}`);
            }
          }

          const suggestedType = substituteBindings(expectedType, bindings);

          const programType = getExpressionType(
            program.expression,
            program.bindings,
            suggestedType?.type === "Lambda"
              ? suggestedType.contextType
              : contextType,
          );

          const actualType =
            suggestedType?.type === "Lambda"
              ? LambdaType(programType, suggestedType.contextType)
              : programType;

          const newBindings = matchTypePattern(
            expectedType,
            actualType,
            bindings,
          );
          if (!newBindings)
            return InvalidType(`Argument mismatch at index ${i}`);

          bindings = mergeBindings(bindings, newBindings);
          if (!bindings) return InvalidType(`Binding mismatch at index ${i}`);

          result.push(actualType);
        }

        currentType = meta.returnType({
          input: currentType,
          args: result,
          ...bindings,
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

    const leftType = getExpressionType([left], bindings, contextType);
    const rightType = getExpressionType([right], bindings, contextType);

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
export const findCompatibleVariables = (expression, bindings, contextType) => {
  if (expression.length === 0) return bindings;

  // If we have an operator and left operand
  if (
    (expression.length === 3 || expression.length === 2) &&
    expression[1].type === "operator"
  ) {
    const [left, op] = expression;
    const leftType = getExpressionType([left], bindings, contextType);

    if (leftType.type === "Invalid") return [];
    const rightTypes = suggestRightTypesForOperator(op.value, leftType);

    return bindings.filter((binding) => {
      const bindingType =
        binding.type ||
        getExpressionType(binding.expression, bindings, contextType);
      return rightTypes.some((rightType) =>
        matchTypePattern(rightType, bindingType),
      );
    });
  }

  return bindings;
};

export const findCompatibleOperators = (expression, bindings, contextType) => {
  if (expression.length !== 1) return [];

  const leftType = getExpressionType([expression[0]], bindings, contextType);
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
export const suggestNextToken = (expression, bindings, contextType) => {
  const result = [];

  // if the expression is empty, suggest all primitive types and variable
  if (expression.length === 0) {
    result.push(
      { type: "number" },
      { type: "string" },
      { type: "boolean" },
      { type: "date" },
      { type: "datetime" },
      { type: "time" },
      { type: "quantity" },
      { type: "type" },
      { type: "variable" },
    );
  }

  if (expression.length === 2 && expression[1].type === "operator") {
    const operator = expression[1].value;

    const leftType = getExpressionType([expression[0]], bindings, contextType);
    const rightTypes = suggestRightTypesForOperator(operator, leftType);

    result.push(
      ...distinct(
        rightTypes
          .map((rightType) => typeName2tokenType[unwrapSingle(rightType).type])
          .concat(["variable"])
          .filter((type) => type),
      ).map((type) => ({ type })),
    );
  }

  if (
    expression.length === 1 &&
    expression[0].type !== "field" &&
    expression[0].type !== "function"
  ) {
    const firstTokenType = getExpressionType(
      [expression[0]],
      bindings,
      contextType,
    );

    if (suggestOperatorsForLeftType(firstTokenType).length > 0) {
      result.push({ type: "operator" });
    }
  }

  if (isChainingExpression(expression) || expression.length === 0) {
    const type = expression.length
      ? getExpressionType(expression, bindings, contextType)
      : contextType;

    if (type.type !== "Single") {
      result.push({ type: "index" });
    }

    result.push(
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
