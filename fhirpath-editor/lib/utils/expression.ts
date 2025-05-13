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
  matchTypePattern,
  NullType,
  QuantityType,
  SingleType,
  stringifyType,
  StringType,
  TimeType,
  TypeType,
  unwrapSingle,
} from "./type";
import { assertDefined, distinct, indexBy, never } from "./misc";
import { getFields } from "./fhir";
import "./function.ts";
import {
  functionMetadata,
  resolveFunctionCall,
  suggestFunctionsForInputType,
} from "./function";
import fhirpath, { Model } from "fhirpath";
import {
  Binding,
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
  TokenKind,
  Type,
  TypeName,
} from "../types/internal";
import { mocked, unparseExpression } from "./fhirpath";

const now = new Date();

function hasMessage(e: any): e is { message: string } {
  return typeof e.message === "string";
}

export const getExpressionValue = (
  name: string | null,
  isLambda: boolean,
  expression: Token[],
  bindingValues: Record<string, FhirValue>,
  questionnaireItems: QuestionnaireItemRegistry,
  contextValue: FhirValue,
  model: Model,
): FhirValue => {
  const code = unparseExpression(expression, {
    questionnaireItems,
    bindingsOrder: {},
    mockSpecials: isLambda,
  });

  if (!code) {
    return contextValue;
  }

  try {
    const value = fhirpath.evaluate(
      contextValue.value,
      code,
      new Proxy(
        {},
        {
          has(_, prop) {
            return (
              (isLambda && prop === mocked("$this")) ||
              (isLambda && prop === mocked("$index")) ||
              prop in bindingValues
            );
          },
          get(_, prop) {
            const value =
              isLambda && prop === mocked("$this")
                ? contextValue
                : isLambda && prop === mocked("$index")
                  ? new FhirValue(0)
                  : bindingValues[prop as string];
            if (value.error) throw value;
            return value.value;
          },
        },
      ),
      model,
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
    while (pos < tokens.length && peek()?.kind !== "operator") {
      leaf.push(next());
    }
    return leaf;
  }

  function parseExpression(minPrec = 0): Token[] | OperatorTreeLeaf {
    let left: OperatorTreeLeaf | Token[];

    // Missing left operand (e.g., starts with operator)
    if (peek()?.kind === "operator") {
      left = [];
    } else {
      left = parseLeaf();
    }

    while (true) {
      const token = peek();
      if (token?.kind !== "operator") break;
      const name = token.value as OperatorName;

      const [prec, assoc] = precedence[name] || [0, "left"];
      if (prec < minPrec) break;

      next(); // consume operator

      // Gracefully handle missing right operand (e.g., end of input)
      let right: OperatorTreeLeaf | Token[];
      if (peek() == null || peek()?.kind === "operator") {
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
  contextType: Type,
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

    if (leftType.name === TypeName.Invalid)
      return InvalidType(`Left operand is "${leftType.error}"`);

    if (rightType.name === TypeName.Invalid)
      return InvalidType(`Right operand is "${rightType.error}"`);

    return resolveOperator(operator, leftType, rightType);
  }

  function getChainingExpressionType(expression: Token[]): Type {
    if (expression.length === 0) return InvalidType("Empty expression");

    const tokens = [...expression];
    let currentType = contextType;
    let first = true;
    if (!tokens.length) return InvalidType("Empty expression");

    while (tokens.length > 0 && currentType?.name !== TypeName.Invalid) {
      const token = tokens.shift();
      assertDefined(token, "Token should be defined");

      if (first) {
        first = false;
        // we are at the first token
        switch (token.kind) {
          case TokenKind.null:
            currentType = SingleType(NullType);
            continue;
          case TokenKind.number:
            currentType = token.value.includes(".")
              ? SingleType(DecimalType)
              : SingleType(IntegerType);
            continue;
          case TokenKind.string:
            currentType = SingleType(StringType);
            continue;
          case TokenKind.boolean:
            currentType = SingleType(BooleanType);
            continue;
          case TokenKind.date:
            currentType = SingleType(DateType);
            continue;
          case TokenKind.datetime:
            currentType = SingleType(DateTimeType);
            continue;
          case TokenKind.time:
            currentType = SingleType(TimeType);
            continue;
          case TokenKind.quantity:
            currentType = SingleType(QuantityType);
            continue;
          case TokenKind.type:
            currentType = TypeType(token.value); // Return the actual type value
            continue;
          case TokenKind.variable: {
            if (token.special) {
              if (token.value === "$this") {
                currentType = SingleType(contextType);
              } else if (token.value === "$index") {
                currentType = SingleType(IntegerType);
              } else {
                return InvalidType(`Unknown keyword "${token.value}"`);
              }
            } else {
              currentType =
                bindingTypes[token.value] ||
                InvalidType(`Unknown variable ${token.value}`);
            }
            continue;
          }
        }
      }

      if (token.kind === TokenKind.index) {
        // Skip index tokens - they don't change the type
        currentType = SingleType(currentType);
      } else if (token.kind === TokenKind.function) {
        currentType = resolveFunctionCall(
          token.value,
          currentType,
          contextType,
          (argIndex: number, contextType: Type) =>
            token.args[argIndex]
              ? getExpressionType(
                  token.args[argIndex].expression,
                  questionnaireItems,
                  bindingTypes, // consider: merge types of token.args[argIndex].bindings
                  contextType,
                  fhirSchema,
                )
              : undefined,
        );
      } else if (token.kind === TokenKind.field) {
        const availableFields = getFields(currentType, fhirSchema);
        currentType =
          availableFields[token.value] ||
          InvalidType(`Unknown field "${token.value}"`);
      } else if (token.kind === TokenKind.answer) {
        if (
          !matchTypePattern(
            ComplexType(["QuestionnaireResponse"]),
            bindingTypes["resource"],
          )
        ) {
          return InvalidType(
            `Answer token cannot be used when resource is not QuestionnaireResponse`,
          );
        }

        const single = currentType.name === TypeName.Single;

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
        return InvalidType(`Unknown token type "${token.kind}"`);
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

  if (op.kind !== TokenKind.operator) {
    throw new Error("Last token is not an operator");
  }

  const name = op.value as OperatorName;
  const [opPrec, opAssoc] = precedence[name] || [0, "left"];

  // Walk left to find the start of the left-hand operand
  let i = opIndex - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (t.kind === "operator") {
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
): [TokenKind[], Token[] | undefined, IOperatorToken | undefined] {
  const literalTypes = [
    TokenKind.string,
    TokenKind.number,
    TokenKind.boolean,
    TokenKind.date,
    TokenKind.datetime,
    TokenKind.quantity,
    TokenKind.time,
  ];

  const startTypes = [
    TokenKind.field,
    TokenKind.function,
    TokenKind.variable,
    TokenKind.type,
    TokenKind.answer,
    ...literalTypes,
  ];

  const valueTypes = new Set([
    TokenKind.field,
    TokenKind.function,
    TokenKind.variable,
    TokenKind.index,
    TokenKind.type,
    TokenKind.answer,
    ...literalTypes,
  ]);

  const last = tokens[tokens.length - 1];
  let types: TokenKind[] = [];
  let contextTokens: Token[] | undefined;
  let operatorToken: IOperatorToken | undefined;

  if (!last) {
    types = startTypes;
  } else if (last.kind === "operator") {
    types = startTypes;
    [contextTokens, operatorToken] = extractOperatorContext(tokens);
  } else if (valueTypes.has(last.kind)) {
    types = [
      TokenKind.field,
      TokenKind.function,
      TokenKind.index,
      TokenKind.operator,
    ];
    let i = tokens.length - 1;
    while (i > 0 && tokens[i - 1]?.kind !== "operator") i--;
    contextTokens = tokens.slice(i);
  }

  return [types, contextTokens, operatorToken];
}

function toTokens(
  kind: TokenKind,
  isLambda: boolean,
  contextType: Type,
  contextExpressionType: Type,
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  fhirSchema: FhirRegistry,
): SuggestedToken[] {
  switch (kind) {
    case TokenKind.null:
      return [{ kind }];
    case TokenKind.string:
      return [{ kind, value: "" }];
    case TokenKind.number:
      return [{ kind, value: "0" }];
    case TokenKind.date:
      return [{ kind, value: now.toISOString().split("T")[0] }];
    case TokenKind.datetime:
      return [{ kind, value: now.toISOString().slice(0, 16) }];
    case TokenKind.time:
      return [{ kind, value: now.toTimeString().slice(0, 5) }];
    case TokenKind.index:
      return [{ kind, value: "0" }];
    case TokenKind.type:
      return [{ kind, value: StringType }];
    case TokenKind.boolean:
      return [{ kind, value: "true" }];
    case TokenKind.quantity:
      return [{ kind, value: { value: "0", unit: "seconds" } }];
    case TokenKind.field: {
      return Object.entries(getFields(contextExpressionType, fhirSchema)).map(
        ([field, type]) => ({
          kind: TokenKind.field,
          value: field,
          debug: stringifyType(type),
        }),
      );
    }
    case TokenKind.answer: {
      return matchTypePattern(
        ComplexType(["QuestionnaireResponse"]),
        bindingTypes["resource"],
      )
        ? Object.keys(questionnaireItems).map((linkId) => ({
            kind,
            value: linkId,
            debug: stringifyType(questionnaireItems[linkId].type),
          }))
        : [];
    }
    case TokenKind.variable: {
      return bindableBindings
        .map(
          (binding) =>
            ({
              kind,
              value: binding.name,
              debug: stringifyType(
                bindingTypes[binding.name] ||
                  InvalidType(`Unknown variable ${binding.name}`),
              ),
            }) as SuggestedToken,
        )
        .concat(
          isLambda
            ? [
                {
                  kind,
                  value: "this",
                  special: true,
                  debug: stringifyType(SingleType(contextType)),
                },
                {
                  kind,
                  value: "index",
                  special: true,
                  debug: stringifyType(SingleType(IntegerType)),
                },
              ]
            : [],
        );
    }
    case TokenKind.function: {
      const compatible = new Set(
        suggestFunctionsForInputType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return functionMetadata.map((meta) => ({
        kind,
        value: meta.name,
        args: [],
        incompatible: !compatible.has(meta.name),
      }));
    }
    case TokenKind.operator: {
      const compatible = new Set(
        suggestOperatorsForLeftType(contextExpressionType).map(
          (meta) => meta.name,
        ),
      );
      return distinct(operatorMetadata.map((meta) => meta.name)).map(
        (name) => ({
          kind,
          value: name,
          incompatible: !compatible.has(name),
        }),
      );
    }
    default:
      never(kind);
  }
}

// Suggest next tokens based on current expression
export function suggestNextTokens(
  isLambda: boolean,
  expression: Token[],
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Type,
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
      isLambda,
      contextType,
      contextExpressionType,
      questionnaireItems,
      bindableBindings,
      bindingTypes,
      fhirSchema,
    ),
  );
}

export function suggestTokensAt<T extends Token>(
  index: number,
  isLambda: boolean,
  expression: Token[],
  questionnaireItems: QuestionnaireItemRegistry,
  bindableBindings: Binding[],
  bindingTypes: Partial<Record<string, Type>>,
  contextType: Type,
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

  if (types.includes(token.kind)) {
    return toTokens(
      token.kind,
      isLambda,
      contextType,
      contextExpressionType,
      questionnaireItems,
      bindableBindings,
      bindingTypes,
      fhirSchema,
    ) as SuggestedToken<T>[];
  }

  return [];
}

function extractReferencedBindingNames(expression: Token[]): string[] {
  return expression.flatMap((token) => {
    if (token.kind === TokenKind.variable && !token.special) {
      return [token.value];
    } else if (token.kind === TokenKind.function) {
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
