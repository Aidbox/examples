import {
  operatorMetadata,
  precedence,
  resolveOperator,
  suggestOperatorsForLeftType,
} from "./operator";
import {
  BooleanType,
  ComplexType,
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
  stringifyType,
  StringType,
  substituteBindings,
  TimeType,
  TypeType,
  unwrapSingle,
  wrapSingle,
} from "./type";
import { assertDefined, distinct, indexBy, never } from "./misc";
import { getFields } from "./fhir";
import "./function.ts";
import { functionMetadata, suggestFunctionsForInputType } from "./function";
import fhirpath from "fhirpath";
import r4 from "fhirpath/fhir-context/r4";
import {
  Binding,
  Context,
  ExternalBinding,
  FhirRegistry,
  FhirValue,
  IOperatorToken,
  IProgram,
  LocalBinding,
  OperatorName,
  OperatorTreeLeaf,
  QuestionnaireItemRegistry,
  SuggestedToken,
  Token,
  TokenType,
  Type,
  TypeName,
} from "../types/internal";
import { unparse } from "./fhirpath";

const now = new Date();

function hasMessage(e: any): e is { message: string } {
  return typeof e.message === "string";
}

export const getExpressionValue = (
  name: string | null,
  expression: Token[],
  bindingValues: Record<string, FhirValue>,
  questionnaireItems: QuestionnaireItemRegistry,
  contextValue: Context["value"],
): FhirValue => {
  const code = unparse(expression, {
    questionnaireItems,
    bindings: [],
  });

  try {
    const value = fhirpath.evaluate(
      contextValue.value,
      code,
      new Proxy(
        {},
        {
          has(_, prop) {
            return prop in bindingValues;
          },
          get(_, prop) {
            const value = bindingValues[prop as string];
            if (value.error) throw value;
            return value.value;
          },
        },
      ),
      r4,
    );

    return new FhirValue(value, name);
  } catch (e) {
    console.log("Error evaluating binding:", code);
    console.log(e);
    if (e instanceof FhirValue) {
      return e;
    } else {
      return new FhirValue(
        null,
        name,
        hasMessage(e) ? e : { message: (e as object).toString() },
      );
    }
  }
};

export const isEmptyProgram = (program: IProgram | undefined) => {
  return (
    !program ||
    (program.bindings.length === 0 && program.expression.length === 0)
  );
};

export const generateBindingId = () =>
  `binding-${Math.random().toString(36).substring(2, 9)}`;

function buildOperatorTree(tokens: Token[]): Token[] | OperatorTreeLeaf {
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

  function parseExpression(minPrec = 0): Token[] | OperatorTreeLeaf {
    let left: OperatorTreeLeaf | Token[];

    // Missing left operand (e.g., starts with operator)
    if (peek()?.type === "operator") {
      left = [];
    } else {
      left = parseLeaf();
    }

    while (true) {
      const token = peek();
      if (token?.type !== "operator") break;
      const name = token.value as OperatorName;

      const [prec, assoc] = precedence[name] || [0, "left"];
      if (prec < minPrec) break;

      next(); // consume operator

      // Gracefully handle missing right operand (e.g., end of input)
      let right: OperatorTreeLeaf | Token[];
      if (peek() == null || peek()?.type === "operator") {
        right = []; // missing right operand
      } else {
        const nextMinPrec = assoc === "left" ? prec + 1 : prec;
        right = parseExpression(nextMinPrec);
      }

      left = { name, left, right };
    }

    return left;
  }

  return parseExpression();
}

export const getExpressionType = (
  expression: Token[],
  questionnaireItems: QuestionnaireItemRegistry,
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Context["type"],
  fhirSchema: FhirRegistry,
) => {
  function getOperatorExpressionType(
    operator: OperatorName,
    left: Token[] | OperatorTreeLeaf,
    right: Token[] | OperatorTreeLeaf,
  ): Type {
    const leftType = Array.isArray(left)
      ? getChainingExpressionType(left)
      : getOperatorExpressionType(left.name, left.left, left.right);

    const rightType = Array.isArray(right)
      ? getChainingExpressionType(right)
      : getOperatorExpressionType(right.name, right.left, right.right);

    if (leftType.type === TypeName.Invalid)
      return InvalidType(`Left operand is "${leftType.error}"`);

    if (rightType.type === TypeName.Invalid)
      return InvalidType(`Right operand is "${rightType.error}"`);

    return resolveOperator(operator, leftType, rightType);
  }

  function getChainingExpressionType(expression: Token[]): Type {
    if (expression.length === 0) return InvalidType("Empty expression");

    const tokens = [...expression];
    let currentType = contextType;
    let first = true;
    if (!tokens.length) return InvalidType("Empty expression");

    while (tokens.length > 0 && currentType?.type !== TypeName.Invalid) {
      const token = tokens.shift();
      assertDefined(token, "Token should be defined");

      if (first) {
        first = false;
        // we are at the first token
        switch (token.type) {
          case TokenType.number:
            currentType = token.value.includes(".")
              ? SingleType(DecimalType)
              : SingleType(IntegerType);
            continue;
          case TokenType.string:
            currentType = SingleType(StringType);
            continue;
          case TokenType.boolean:
            currentType = SingleType(BooleanType);
            continue;
          case TokenType.date:
            currentType = SingleType(DateType);
            continue;
          case TokenType.datetime:
            currentType = SingleType(DateTimeType);
            continue;
          case TokenType.time:
            currentType = SingleType(TimeType);
            continue;
          case TokenType.quantity:
            currentType = SingleType(QuantityType);
            continue;
          case TokenType.type:
            currentType = TypeType(token.value); // Return the actual type value
            continue;
          case TokenType.variable: {
            currentType =
              bindingTypes[token.value] ||
              InvalidType(`Unknown variable ${token.value}`);
            continue;
          }
        }
      }

      if (token.type === TokenType.index) {
        // Skip index tokens - they don't change the type
        currentType = wrapSingle(currentType);
      } else if (token.type === TokenType.function) {
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
            bindingTypes, // todo: merge types of program.bindings
            suggestedType?.type === TypeName.Lambda
              ? suggestedType.contextType
              : contextType,
            fhirSchema,
          );

          const actualType =
            suggestedType?.type === TypeName.Lambda
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
      } else if (token.type === TokenType.field) {
        const availableFields = getFields(currentType, fhirSchema);
        currentType =
          availableFields[token.value] ||
          InvalidType(`Unknown field "${token.value}"`);
      } else if (token.type === TokenType.answer) {
        if (
          !matchTypePattern(ComplexType(["QuestionnaireResponse"]), currentType)
        ) {
          return InvalidType(`Answer token cannot be used in this context`);
        }

        const single = currentType.type === TypeName.Single;

        currentType =
          questionnaireItems[token.value]?.type ||
          getFields(
            ComplexType(["QuestionnaireResponse", "item", "answer"]),
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
    return getOperatorExpressionType(tree.name, tree.left, tree.right);
  }
};

function extractOperatorContext(
  tokens: Token[],
): [Token[] | undefined, IOperatorToken | undefined] {
  const opIndex = tokens.length - 1;
  const op = tokens[opIndex];

  if (op.type !== TokenType.operator) {
    throw new Error("Last token is not an operator");
  }

  const name = op.value as OperatorName;
  const [opPrec, opAssoc] = precedence[name] || [0, "left"];

  // Walk left to find the start of the left-hand operand
  let i = opIndex - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (t.type === "operator") {
      const name = t.value as OperatorName;
      const [tPrec, tAssoc] = precedence[name] || [0, "left"];
      const breakByPrecedence =
        tPrec < opPrec || (tPrec === opPrec && tAssoc !== opAssoc);
      if (breakByPrecedence) break;
    }
    i--;
  }

  const leftStart = Math.max(0, i + 1);
  return [
    tokens.slice(leftStart, opIndex),
    tokens[opIndex] as IOperatorToken | undefined,
  ]; // includes left operand + current operator
}

function suggestNextTokenTypes(
  tokens: Token[],
): [TokenType[], Token[] | undefined, IOperatorToken | undefined] {
  const literalTypes = [
    TokenType.string,
    TokenType.number,
    TokenType.boolean,
    TokenType.date,
    TokenType.datetime,
    TokenType.quantity,
    TokenType.time,
  ];

  const startTypes = [
    TokenType.field,
    TokenType.function,
    TokenType.variable,
    TokenType.type,
    TokenType.answer,
    ...literalTypes,
  ];

  const valueTypes = new Set([
    TokenType.field,
    TokenType.function,
    TokenType.variable,
    TokenType.index,
    TokenType.type,
    TokenType.answer,
    ...literalTypes,
  ]);

  const last = tokens[tokens.length - 1];
  let types: TokenType[] = [];
  let contextTokens: Token[] | undefined;
  let operatorToken: IOperatorToken | undefined;

  if (!last) {
    types = startTypes;
  } else if (last.type === "operator") {
    types = startTypes;
    [contextTokens, operatorToken] = extractOperatorContext(tokens);
  } else if (valueTypes.has(last.type)) {
    types = [
      TokenType.field,
      TokenType.function,
      TokenType.index,
      TokenType.operator,
    ];
    let i = tokens.length - 1;
    while (i > 0 && tokens[i - 1]?.type !== "operator") i--;
    contextTokens = tokens.slice(i);
  }

  return [types, contextTokens, operatorToken];
}

function toTokens(
  type: TokenType,
  contextExpressionType: Type,
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Context["type"],
  fhirSchema: FhirRegistry,
): SuggestedToken[] {
  switch (type) {
    case TokenType.string:
      return [{ type, value: "" }];
    case TokenType.number:
      return [{ type, value: "0" }];
    case TokenType.date:
      return [{ type, value: now.toISOString().split("T")[0] }];
    case TokenType.datetime:
      return [{ type, value: now.toISOString().slice(0, 16) }];
    case TokenType.time:
      return [{ type, value: now.toTimeString().slice(0, 5) }];
    case TokenType.index:
      return [{ type, value: "0" }];
    case TokenType.type:
      return [{ type, value: StringType }];
    case TokenType.boolean:
      return [{ type, value: "true" }];
    case TokenType.quantity:
      return [{ type, value: { value: "0", unit: "seconds" } }];
    case TokenType.field: {
      return Object.entries(getFields(contextExpressionType, fhirSchema)).map(
        ([field, type]) => ({
          type: TokenType.field,
          value: field,
          debug: stringifyType(type),
        }),
      );
    }
    case TokenType.answer: {
      return matchTypePattern(
        ComplexType(["QuestionnaireResponse"]),
        contextType,
      )
        ? Object.keys(questionnaireItems).map((linkId) => ({
            type,
            value: linkId,
            debug: stringifyType(questionnaireItems[linkId].type),
          }))
        : [];
    }
    case TokenType.variable: {
      return bindableBindings.map((binding) => ({
        type,
        value: binding.name,
        debug: stringifyType(
          bindingTypes[binding.name] ||
            InvalidType(`Unknown variable ${binding.name}`),
        ),
      }));
    }
    case TokenType.function: {
      const compatible = new Set(
        suggestFunctionsForInputType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return functionMetadata.map((meta) => ({
        type,
        value: meta.name,
        args: [],
        incompatible: !compatible.has(meta.name),
      }));
    }
    case TokenType.operator: {
      const compatible = new Set(
        suggestOperatorsForLeftType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return distinct(operatorMetadata.map((meta) => meta.name)).map(
        (name) => ({
          type,
          value: name,
          incompatible: !compatible.has(name),
        }),
      );
    }
    default:
      never(type);
  }
}

// Suggest next tokens based on current expression
export function suggestNextTokens(
  expression: Token[],
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Context["type"],
  fhirSchema: FhirRegistry,
): SuggestedToken[] {
  const [types, contextExpression, operatorToken] =
    suggestNextTokenTypes(expression);

  const contextExpressionType =
    !operatorToken && contextExpression
      ? getExpressionType(
          contextExpression,
          questionnaireItems,
          bindingTypes,
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
      bindableBindings,
      bindingTypes,
      contextType,
      fhirSchema,
    ),
  );
}

export function suggestTokensAt<T extends Token>(
  index: number,
  expression: Token[],
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Context["type"],
  fhirSchema: FhirRegistry,
): SuggestedToken<T>[] {
  const token = expression[index];
  const precedingExpression = expression.slice(0, index);

  const [types, contextExpression, operatorToken] =
    suggestNextTokenTypes(precedingExpression);

  const contextExpressionType =
    !operatorToken && contextExpression
      ? getExpressionType(
          contextExpression,
          questionnaireItems,
          bindingTypes,
          contextType,
          fhirSchema,
        )
      : contextType;

  if (types.includes(token.type)) {
    return toTokens(
      token.type,
      contextExpressionType,
      questionnaireItems,
      bindableBindings,
      bindingTypes,
      contextType,
      fhirSchema,
    ) as SuggestedToken<T>[];
  }

  return [];
}

// Type guards
export function isLocalBinding(binding: Binding): binding is LocalBinding {
  return (
    "expression" in binding && !("type" in binding) && !("value" in binding)
  );
}

export function isExternalBinding(
  binding: Binding,
): binding is ExternalBinding {
  return "type" in binding && "value" in binding && !("expression" in binding);
}

function extractReferencedBindingNames(expression: Token[]): string[] {
  return expression.flatMap((token) => {
    if (token.type === TokenType.variable) {
      return [token.value];
    } else if (token.type === TokenType.function) {
      return token.args.flatMap((arg) => {
        if (!arg) return [];

        const shadowedNames = arg.bindings.map((b) => b.name);
        const references = [
          ...extractReferencedBindingNames(arg.expression),
          ...arg.bindings.flatMap((binding) =>
            extractReferencedBindingNames(binding.expression),
          ),
        ];
        return references.filter((name) => !shadowedNames.includes(name));
      });
    } else {
      return [];
    }
  });
}

export function extractReferencedBindings(
  expression: Token[],
  bindings: LocalBinding[],
): Set<string> {
  const names = distinct(extractReferencedBindingNames(expression));
  const index = indexBy(bindings, "name");
  return new Set(names.map((name) => index[name]?.id).filter(Boolean));
}

export function getTransitiveDependencies(
  graph: Record<string, Set<string>>,
  id: string,
): Set<string> {
  const visited = new Set<string>();
  const stack = [id];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const deps = graph[current];

    if (!deps) continue;

    for (const dep of deps) {
      if (!visited.has(dep)) {
        visited.add(dep);
        stack.push(dep);
      }
    }
  }

  return visited;
}

export function getTransitiveDependents(
  graph: Record<string, Set<string>>,
  id: string,
): Set<string> {
  const result = new Set<string>();

  const hasPathTo = (
    from: string,
    target: string,
    visited = new Set<string>(),
  ): boolean => {
    if (from === target) return true;
    if (visited.has(from)) return false;

    visited.add(from);
    for (const neighbor of graph[from] || []) {
      if (hasPathTo(neighbor, target, visited)) return true;
    }

    return false;
  };

  for (const candidate of Object.keys(graph)) {
    if (candidate !== id && hasPathTo(candidate, id)) {
      result.add(candidate);
    }
  }

  return result;
}

export function walkDependencyGraph(
  graph: Record<string, Set<string>>,
  f: (nodeId: string) => void,
) {
  const visited = new Set<string>();

  function visit(node: string) {
    if (visited.has(node)) return;
    visited.add(node);

    const deps = graph[node] || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    f(node);
  }

  for (const node of Object.keys(graph)) {
    visit(node);
  }
}
