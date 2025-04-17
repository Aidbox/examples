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
  wrapSingle,
} from "./type.js";
import { distinct, pick } from "./misc.js";
import { FhirType, getFields } from "./fhir.js";
import "./function.js";
import { functionMetadata, suggestFunctionsForInputType } from "./function.js";
import { stringifyProgram, stringifyType } from "@utils/stringify.js";
import fhirpath from "fhirpath";
import r4 from "fhirpath/fhir-context/r4";

export const evaluateExpression = (
  expression,
  bindings,
  contextValue,
  externalBindings,
) => {
  if (isEmptyProgram({ bindings, expression })) return null;

  const code = stringifyProgram({
    bindings,
    expression,
  });

  try {
    return fhirpath.evaluate(
      structuredClone(contextValue),
      code,
      Object.fromEntries(
        externalBindings.map((binding) => [
          binding.name,
          structuredClone(binding.value),
        ]),
      ),
      r4,
    );
  } catch (e) {
    console.debug("Error evaluating binding:", code);
    console.debug(e);
    throw e;
  }
};

export const isEmptyProgram = (program) => {
  return (
    !program ||
    (program.bindings.length === 0 && program.expression.length === 0)
  );
};

export const findReferencedBindings = (binding) => {
  return binding.expression
    .filter((token) => token.type === "variable")
    .map((token) => token.value);
};

export const generateBindingId = () =>
  `binding-${Math.random().toString(36).substring(2, 9)}`;

function isChainingExpression(expression) {
  if (expression.length >= 1) {
    if (
      expression[0].type === "variable" ||
      expression[0].type === "field" ||
      expression[0].type === "answer" ||
      expression[0].type === "function"
    ) {
      if (
        expression
          .slice(1)
          .every(
            (token) =>
              token.type === "field" ||
              token.type === "index" ||
              token.type === "answer" ||
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
export const getExpressionType = (
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
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
      return getExpressionType(
        binding.expression,
        questionnaireItems,
        bindings,
        contextType,
        fhirSchema,
      );
    }
  }

  if (isChainingExpression(expression)) {
    let tokens = [...expression];

    let currentType = contextType;
    let first = true;
    if (!tokens.length) return InvalidType("Empty expression");

    while (tokens.length > 0 && currentType?.type !== InvalidType.type) {
      const token = tokens.shift();

      if (token.type === "variable") {
        if (!first) {
          return InvalidType(`Unexpected token "variable"`);
        }
        const binding = bindings.find((b) => b.name === token.value);
        currentType = !binding
          ? InvalidType(`Unknown variable "${token.value}"`)
          : binding.type ||
            getExpressionType(
              binding.expression,
              questionnaireItems,
              bindings,
              contextType,
              fhirSchema,
            );
      } else if (token.type === "index") {
        // Skip index tokens - they don't change the type
        currentType = wrapSingle(currentType);
      } else if (token.type === "function") {
        const meta = functionMetadata.find((f) => f.name === token.value);
        if (!meta) return InvalidType(`Unknown function "${token.value}"`);

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
            questionnaireItems,
            program.bindings,
            suggestedType?.type === LambdaType.type
              ? suggestedType.contextType
              : contextType,
            fhirSchema,
          );

          const actualType =
            suggestedType?.type === LambdaType.type
              ? LambdaType(programType, suggestedType.contextType)
              : programType;

          const newBindings = matchTypePattern(
            expectedType,
            actualType,
            bindings,
          );
          if (!newBindings) {
            console.debug("  ↳ expected", stringifyType(expectedType));
            console.debug("  ↳ actual", stringifyType(actualType));
            console.debug("  ↳ bindings");
            Object.entries(bindings).map(([name, type]) => {
              console.debug(`    ↳  ${name}: `, stringifyType(type));
            });
            return InvalidType(`Argument type mismatch at index ${i}`);
          }

          bindings = mergeBindings(bindings, newBindings);
          if (!bindings) return InvalidType(`Binding mismatch at index ${i}`);

          result.push(actualType);
        }

        currentType = meta.returnType({
          input: currentType,
          args: result,
          ...bindings,
        });
      } else if (token.type === "field") {
        const availableFields = getFields(currentType, fhirSchema);
        currentType =
          availableFields[token.value] ||
          InvalidType(`Unknown field "${token.value}"`);
      } else if (token.type === "answer") {
        if (
          !matchTypePattern(FhirType(["QuestionnaireResponse"]), currentType)
        ) {
          return InvalidType(`Answer token cannot be used in this context`);
        }

        const single = currentType.type === SingleType.type;

        currentType =
          questionnaireItems[token.value]?.type ||
          getFields(
            FhirType(["QuestionnaireResponse", "item", "answer"]),
            fhirSchema,
          ).value;

        if (!single) {
          currentType = unwrapSingle(currentType);
        }
      } else {
        return InvalidType(`Unknown token type "${token.type}"`);
      }

      first = false;
    }

    return currentType;
  }

  // For expressions with operators
  if (isOperatorExpression(expression)) {
    const [left, operator, right] = expression;

    const leftType = getExpressionType(
      [left],
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );
    const rightType = getExpressionType(
      [right],
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );

    if (
      leftType.type === InvalidType.type ||
      rightType.type === InvalidType.type
    )
      return InvalidType("Invalid argument types");

    return resolveOperator(operator.value, leftType, rightType);
  }

  return InvalidType("Unknown expression");
};

export const findCompatibleBindings = (
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
  if (expression.length === 0) return bindings;

  // If we have an operator and left operand
  if (
    (expression.length === 3 || expression.length === 2) &&
    expression[1].type === "operator"
  ) {
    const [left, operator] = expression;
    const leftType = getExpressionType(
      [left],
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );

    if (leftType.type === InvalidType.type) return [];
    const rightTypes = suggestRightTypesForOperator(operator.value, leftType);

    return bindings.filter((binding) => {
      const bindingType =
        binding.type ||
        getExpressionType(
          binding.expression,
          questionnaireItems,
          bindings,
          contextType,
          fhirSchema,
        );
      return rightTypes.some((rightType) =>
        matchTypePattern(rightType, bindingType),
      );
    });
  }

  return bindings;
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
export const suggestNextToken = (
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
  const result = [];

  // if the expression is empty, suggest all primitive types and variable
  if (expression.length === 0) {
    if (matchTypePattern(FhirType(["QuestionnaireResponse"]), contextType)) {
      result.push(
        ...Object.keys(questionnaireItems).map((linkId) => ({
          type: "answer",
          value: linkId,
        })),
      );
    }
    result.push(
      { type: "number" },
      { type: "string" },
      { type: "boolean" },
      { type: "date" },
      { type: "datetime" },
      { type: "time" },
      { type: "quantity" },
      { type: "type" },
      ...bindings.map((binding) => ({
        type: "variable",
        value: binding.name,
        debug: stringifyType(
          binding.type ||
            getExpressionType(
              binding.expression,
              questionnaireItems,
              bindings,
              contextType,
              fhirSchema,
            ),
        ),
      })),
    );
  }

  if (expression.length === 2 && expression[1].type === "operator") {
    const operator = expression[1].value;

    const leftType = getExpressionType(
      [expression[0]],
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );
    const rightTypes = suggestRightTypesForOperator(operator, leftType);

    result.push(
      ...distinct(
        Object.values(
          pick(
            typeName2tokenType,
            rightTypes.map((type) => unwrapSingle(type).type),
          ),
        ),
      ).map((type) => ({ type })),
      ...findCompatibleBindings(
        expression,
        questionnaireItems,
        bindings,
        contextType,
        fhirSchema,
      ).map((binding) => ({
        type: "variable",
        value: binding.name,
        debug: stringifyType(
          binding.type ||
            getExpressionType(
              binding.expression,
              questionnaireItems,
              bindings,
              contextType,
              fhirSchema,
            ),
        ),
      })),
    );
  }

  if (
    expression.length === 1 &&
    expression[0].type !== "field" &&
    expression[0].type !== "function"
  ) {
    const firstTokenType = getExpressionType(
      [expression[0]],
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );

    result.push(
      ...distinct(
        suggestOperatorsForLeftType(firstTokenType).map((meta) => meta.name),
      ).map((name) => ({
        type: "operator",
        value: name,
      })),
    );
  }

  if (isChainingExpression(expression) || expression.length === 0) {
    const type = expression.length
      ? getExpressionType(
          expression,
          questionnaireItems,
          bindings,
          contextType,
          fhirSchema,
        )
      : contextType;

    if (type.type !== SingleType.type) {
      result.push({ type: "index" });
    }

    result.push(
      ...Object.entries(getFields(type, fhirSchema)).map(([field, type]) => ({
        type: "field",
        value: field,
        debug: stringifyType(type),
      })),
      ...suggestFunctionsForInputType(type).map((meta) => ({
        type: "function",
        value: meta.name,
      })),
    );
  }

  return result;
};

// console.log(suggestFunctionsForInputType(CollectionType(StringType)));
