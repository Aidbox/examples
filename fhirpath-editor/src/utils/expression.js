import {
  operatorMetadata,
  precedence,
  resolveOperator,
  suggestOperatorsForLeftType,
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
import { distinct } from "./misc.js";
import { FhirType, getFields } from "./fhir.js";
import "./function.js";
import { functionMetadata, suggestFunctionsForInputType } from "./function.js";
import { stringifyProgram, stringifyType } from "@utils/stringify.js";
import fhirpath from "fhirpath";
import r4 from "fhirpath/fhir-context/r4";

export const evaluateExpression = (
  expression,
  questionnaireItems,
  bindings,
  contextValue,
  externalBindings,
) => {
  if (isEmptyProgram({ bindings, expression })) return null;

  const code = stringifyProgram(
    {
      bindings,
      expression,
    },
    {
      questionnaireItems,
    },
  );

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

export const generateBindingId = () =>
  `binding-${Math.random().toString(36).substring(2, 9)}`;

function buildOperatorTree(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function next() {
    return tokens[pos++];
  }

  function parseLeaf() {
    const leaf = [];
    while (pos < tokens.length && peek()?.type !== "operator") {
      leaf.push(next());
    }
    return leaf;
  }

  function parseExpression(minPrec = 0) {
    let left;

    // Missing left operand (e.g., starts with operator)
    if (peek()?.type === "operator") {
      left = [];
    } else {
      left = parseLeaf();
    }

    while (true) {
      const token = peek();
      if (token?.type !== "operator") break;

      const [prec, assoc] = precedence[token.value] || [0, "left"];
      if (prec < minPrec) break;

      next(); // consume operator

      // Gracefully handle missing right operand (e.g., end of input)
      let right;
      if (peek() == null || peek()?.type === "operator") {
        right = []; // missing right operand
      } else {
        const nextMinPrec = assoc === "left" ? prec + 1 : prec;
        right = parseExpression(nextMinPrec);
      }

      left = {
        op: token.value,
        left,
        right,
      };
    }

    return left;
  }

  return parseExpression();
}

export const getExpressionType = (
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
  function getOperatorExpressionType(operator, left, right) {
    const leftType = Array.isArray(left)
      ? getChainingExpressionType(left)
      : getOperatorExpressionType(left.op, left.left, left.right);

    const rightType = Array.isArray(right)
      ? getChainingExpressionType(right)
      : getOperatorExpressionType(right.op, right.left, right.right);

    if (leftType.type === InvalidType.type)
      return InvalidType(`Left operand is "${leftType.error}"`);

    if (rightType.type === InvalidType.type)
      return InvalidType(`Right operand is "${rightType.error}"`);

    return resolveOperator(operator, leftType, rightType);
  }

  function getChainingExpressionType(expression) {
    if (expression.length === 0) return InvalidType("Empty expression");

    let tokens = [...expression];
    let currentType = contextType;
    let first = true;
    if (!tokens.length) return InvalidType("Empty expression");

    while (tokens.length > 0 && currentType?.type !== InvalidType.type) {
      const token = tokens.shift();

      if (first) {
        first = false;
        // we are at the first token
        switch (token.type) {
          case "number":
            currentType = token.value.includes(".")
              ? SingleType(DecimalType)
              : SingleType(IntegerType);
            continue;
          case "string":
            currentType = SingleType(StringType);
            continue;
          case "boolean":
            currentType = SingleType(BooleanType);
            continue;
          case "date":
            currentType = SingleType(DateType);
            continue;
          case "datetime":
            currentType = SingleType(DateTimeType);
            continue;
          case "time":
            currentType = SingleType(TimeType);
            continue;
          case "quantity":
            currentType = SingleType(QuantityType);
            continue;
          case "type":
            currentType = TypeType(token.value); // Return the actual type value
            continue;
          case "variable": {
            const binding = bindings.find((b) => b.name === token.value);
            currentType = !binding
              ? InvalidType("Unknown variable")
              : binding.type ||
                getExpressionType(
                  binding.expression,
                  questionnaireItems,
                  bindings,
                  contextType,
                  fhirSchema,
                );
            continue;
          }
        }
      }

      if (token.type === "index") {
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

  const tree = buildOperatorTree(expression);

  if (Array.isArray(tree)) {
    return getChainingExpressionType(tree);
  } else {
    return getOperatorExpressionType(tree.op, tree.left, tree.right);
  }
};

function extractOperatorContext(tokens) {
  const opIndex = tokens.length - 1;
  const op = tokens[opIndex];
  const [opPrec, opAssoc] = precedence[op.value] || [0, "left"];

  // Walk left to find the start of the left-hand operand
  let i = opIndex - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (t.type === "operator") {
      const [tPrec, tAssoc] = precedence[t.value] || [0, "left"];
      const breakByPrecedence =
        tPrec < opPrec || (tPrec === opPrec && tAssoc !== opAssoc);
      if (breakByPrecedence) break;
    }
    i--;
  }

  const leftStart = Math.max(0, i + 1);
  return [tokens.slice(leftStart, opIndex), tokens[opIndex]]; // includes left operand + current operator
}

function suggestNextTokenTypes(tokens) {
  const last = tokens[tokens.length - 1];

  const literalTypes = [
    "string",
    "number",
    "boolean",
    "date",
    "datetime",
    "quantity",
    "time",
  ];

  const startTypes = [
    "field",
    "function",
    "variable",
    "type",
    "answer",
    ...literalTypes,
  ];

  const valueTypes = new Set([
    "field",
    "function",
    "variable",
    "index",
    "type",
    "answer",
    ...literalTypes,
  ]);

  let types;
  let contextTokens;
  let operatorToken;

  if (!last) {
    types = startTypes;
    contextTokens = null;
  } else if (last.type === "operator") {
    types = startTypes;
    [contextTokens, operatorToken] = extractOperatorContext(tokens);
  } else if (valueTypes.has(last.type)) {
    types = ["field", "function", "index", "operator"];
    let i = tokens.length - 1;
    while (i > 0 && tokens[i - 1]?.type !== "operator") i--;
    contextTokens = tokens.slice(i);
  } else {
    types = [];
    contextTokens = null;
  }

  return [types, contextTokens, operatorToken];
}

function toTokens(
  type,
  contextExpressionType,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) {
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "date":
    case "datetime":
    case "quantity":
    case "time":
    case "index":
    case "type":
      return [{ type }];
    case "field": {
      return Object.entries(getFields(contextExpressionType, fhirSchema)).map(
        ([field, type]) => ({
          type: "field",
          value: field,
          debug: stringifyType(type),
        }),
      );
    }
    case "answer": {
      return matchTypePattern(FhirType(["QuestionnaireResponse"]), contextType)
        ? Object.keys(questionnaireItems).map((linkId) => ({
            type: "answer",
            value: linkId,
            debug: stringifyType(questionnaireItems[linkId].type),
          }))
        : [];
    }
    case "variable": {
      return bindings.map((binding) => ({
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
      }));
    }
    case "function": {
      const compatible = new Set(
        suggestFunctionsForInputType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return functionMetadata.map((meta) => ({
        type: "function",
        value: meta.name,
        incompatible: !compatible.has(meta.name),
      }));
    }
    case "operator": {
      const compatible = new Set(
        suggestOperatorsForLeftType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return distinct(operatorMetadata.map((meta) => meta.name)).map(
        (name) => ({
          type: "operator",
          value: name,
          incompatible: !compatible.has(name),
        }),
      );
    }
  }
}

// Suggest next tokens based on current expression
export const suggestNextTokens = (
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
  const [types, contextExpression, operatorToken] =
    suggestNextTokenTypes(expression);

  let contextExpressionType =
    !operatorToken && contextExpression
      ? getExpressionType(
          contextExpression,
          questionnaireItems,
          bindings,
          contextType,
          fhirSchema,
        )
      : contextType;

  // let contextOperandType =
  //   operatorToken &&
  //   suggestRightTypesForOperator(
  //     operatorToken.value,
  //     contextExpression
  //       ? contextExpressionType
  //       : InvalidType("Empty right operand"),
  //   );

  return types.flatMap((type) =>
    toTokens(
      type,
      contextExpressionType,
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    ),
  );
};

export const suggestTokensAt = (
  index,
  expression,
  questionnaireItems,
  bindings,
  contextType,
  fhirSchema,
) => {
  const token = expression[index];
  const precedingExpression = expression.slice(0, index);

  const [types, contextExpression, operatorToken] =
    suggestNextTokenTypes(precedingExpression);

  let contextExpressionType =
    !operatorToken && contextExpression
      ? getExpressionType(
          contextExpression,
          questionnaireItems,
          bindings,
          contextType,
          fhirSchema,
        )
      : contextType;

  if (types.includes(token.type)) {
    return toTokens(
      token.type,
      contextExpressionType,
      questionnaireItems,
      bindings,
      contextType,
      fhirSchema,
    );
  }
};
