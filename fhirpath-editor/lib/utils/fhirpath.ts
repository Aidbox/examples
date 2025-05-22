import { TreeCursor } from "@lezer/common";
import { parser, terminals } from "lezer-fhirpath";
import {
  IAnswerToken,
  IBooleanToken,
  IDateTimeToken,
  IDateToken,
  IFieldToken,
  IFunctionToken,
  IIndexToken,
  INumberToken,
  IOperatorToken,
  IProgram,
  IQuantityToken,
  IStringToken,
  ITimeToken,
  ITypeToken,
  IVariableToken,
  LezerNode,
  LezerNonTerminalNode,
  LezerTerminalNode,
  LocalBinding,
  OperatorName,
  Token,
  TokenKind,
  TypeName,
  UnparseContext,
} from "../types/internal";
import { generateBindingId } from "./expression";
import {
  ComplexType,
  primitiveTypeMap,
  standardTypeMap,
  typePrimitiveMap,
} from "./type";
import { assertDefined } from "./misc.ts";

function isLezerTerminalNode<T>(
  node: LezerNode<T> | undefined,
): node is LezerTerminalNode<T> {
  return !!node?.type && terminals.includes(node.type);
}

function isLezerNonTerminalNode<T>(
  node: LezerNode<T> | undefined,
): node is LezerNonTerminalNode<T> {
  return !!node?.type && !terminals.includes(node.type);
}

function assertNonTerminalNode<T>(
  node: LezerNode<T> | undefined,
): asserts node is LezerNonTerminalNode<T> {
  if (!isLezerNonTerminalNode(node)) {
    throw new Error(`Expected non-terminal node, but got ${node?.type}`);
  }
}

function assertTerminalNode<T>(
  node: LezerNode<T> | undefined,
): asserts node is LezerTerminalNode<T> {
  if (!isLezerTerminalNode(node)) {
    throw new Error(`Expected terminal node, but got ${node?.type}`);
  }
}

function buildNode(cursor: TreeCursor, input: string): LezerNode {
  const type = cursor.node.type.name;
  const value = input.slice(cursor.from, cursor.to);

  const children: LezerNode[] = [];

  // Process children
  if (cursor.firstChild()) {
    do {
      const child = buildNode(cursor, input);

      if (child.type === "BlockComment" && isLezerTerminalNode(child)) {
        const last = children[children.length - 1];
        if (last) {
          last.comment = child.value;
        }
      }

      // Skip certain token types
      if (
        child.type === "(" ||
        child.type === ")" ||
        child.type === "[" ||
        child.type === "]" ||
        child.type === "," ||
        child.type === "." ||
        child.type === "%" ||
        child.type === "⚠" ||
        child.type === "LineComment" ||
        child.type === "BlockComment"
      ) {
        continue;
      }

      children.push(child);
    } while (cursor.nextSibling());
    cursor.parent();
  }

  return terminals.includes(type)
    ? ({ type, value } as LezerTerminalNode)
    : ({ type, children } as LezerNode);
}

function unescapeString(text: string): string {
  return text
    .slice(1, -1)
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\`/g, "`")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\f/g, "\f");
}

function unescapeIdentifier(text: string): string {
  if (text.startsWith("`") && text.endsWith("`")) {
    return unescapeString(text);
  } else {
    return text;
  }
}

function makeAdditiveFromPolarity(
  operator: LezerNode,
  operand: LezerNode,
): LezerNode {
  const zero = {
    type: "Literal",
    children: [{ type: "Number", value: "0" }],
  };

  return {
    type: "AdditiveExpression",
    children: [zero, operator, operand],
  };
}

function hasHigherPrecedence(a: LezerNode, b: LezerNode) {
  const precedence: Record<string, number> = {
    InvocationExpression: 13,
    IndexerExpression: 12,
    PolarityExpression: 11,
    MultiplicativeExpression: 10,
    AdditiveExpression: 9,
    TypeExpression: 8,
    UnionExpression: 7,
    InequalityExpression: 6,
    EqualityExpression: 5,
    MembershipExpression: 4,
    AndExpression: 3,
    OrExpression: 2,
    ImpliesExpression: 1,
  };

  return (
    a &&
    b &&
    precedence[a.type] !== undefined &&
    precedence[b.type] !== undefined &&
    (precedence[a.type] || 0) > (precedence[b.type] || 0)
  );
}

export const PLACEHOLDER = Symbol("placeholder");
type LezerNodeTemplate = LezerNode<string | typeof PLACEHOLDER>;

const resourceTemplate: LezerNodeTemplate = {
  type: "ExternalConstant",
  children: [{ type: "Identifier", value: "resource" }],
};

const repeatTemplate = {
  type: "InvocationExpression",
  children: [
    resourceTemplate,
    {
      type: "Function",
      children: [
        { type: "Identifier", value: "repeat" },
        {
          type: "ParamList",
          children: [{ type: "Identifier", value: "item" }],
        },
      ],
    },
  ],
};

const whereArgumentTemplate: LezerNodeTemplate = {
  type: "EqualityExpression",
  children: [
    { type: "Identifier", value: "linkId" },
    { type: "=", value: "=" },
    {
      type: "Literal",
      children: [
        {
          type: "String",
          value: PLACEHOLDER,
        },
      ],
    },
  ],
};

const whereTemplate: LezerNodeTemplate = {
  type: "InvocationExpression",
  children: [
    repeatTemplate,
    {
      type: "Function",
      children: [
        { type: "Identifier", value: "where" },
        {
          type: "ParamList",
          children: [whereArgumentTemplate],
        },
      ],
    },
  ],
};

const answerTemplate: LezerNodeTemplate = {
  type: "InvocationExpression",
  children: [whereTemplate, { type: "Identifier", value: "answer" }],
};

const valueTemplate: LezerNodeTemplate = {
  type: "InvocationExpression",
  children: [answerTemplate, { type: "Identifier", value: "value" }],
};

const valueOfValueTemplate: LezerNodeTemplate = {
  type: "InvocationExpression",
  children: [valueTemplate, { type: "Identifier", value: "value" }],
};

const ordinalOfValueTemplate: LezerNodeTemplate = {
  type: "InvocationExpression",
  children: [
    repeatTemplate,
    {
      type: "Function",
      children: [
        { type: "Identifier", value: "ordinal" },
        {
          type: "ParamList",
          children: [],
        },
      ],
    },
  ],
};

export function matchNodeTemplate(
  template: LezerNodeTemplate,
  actual: LezerNode,
): string | undefined {
  let placeholder: string | undefined = undefined;

  function match(
    templateNode: LezerNodeTemplate,
    valueNode: LezerNode,
  ): boolean {
    if (templateNode.type !== valueNode.type) return false;

    if (isLezerTerminalNode(templateNode)) {
      if (!isLezerTerminalNode(valueNode)) {
        return false;
      }

      if (templateNode.value === PLACEHOLDER) {
        placeholder = valueNode.value;
        return true;
      }

      return templateNode.value === valueNode.value;
    } else {
      if (isLezerTerminalNode(valueNode)) {
        return false;
      }

      const tChildren = templateNode.children ?? [];
      const vChildren = valueNode.children ?? [];

      if (tChildren.length !== vChildren.length) {
        return false;
      }

      for (let i = tChildren.length - 1; i >= 0; i--) {
        const tChild = tChildren[i];
        const vChild = vChildren[i];
        if (!tChild || !vChild || !match(tChild, vChild)) {
          return false;
        }
      }

      return true;
    }
  }

  return match(template, actual) ? placeholder : undefined;
}

const ANSWER_TOKEN_MARKER = "/* ~answer */";

function transformNode(node: LezerNode): IProgram {
  const bindings: LocalBinding[] = [];
  let varCounter = 0;

  function define({
    name,
    expression,
  }: {
    name?: string;
    expression: Token[];
  }): Token[] {
    if (expression.length === 1 && expression[0]?.kind === TokenKind.variable) {
      return expression;
    }
    if (name && bindings.find((b) => b.name === name)) {
      return [{ kind: TokenKind.variable, value: name }];
    }

    const binding: LocalBinding = {
      id: generateBindingId(),
      name: name || `var${++varCounter}`,
      expression,
    };
    bindings.push(binding);

    return [{ kind: TokenKind.variable, value: binding.name }];
  }

  function walk(node: LezerNode, first = false): Token[] {
    try {
      switch (node.type) {
        case "Document": {
          assertNonTerminalNode(node);
          return (node.children[0] && walk(node.children[0], true)) || [];
        }

        case "Literal": {
          assertNonTerminalNode(node);
          const child = node.children[0];
          assertTerminalNode(child);

          if (child.type === "Quantity") {
            assertNonTerminalNode(node);

            const [value, unit] = node.children;
            assertTerminalNode(value);
            assertTerminalNode(unit);

            return [
              {
                kind: TokenKind.quantity,
                value: {
                  value: value.value || "0",
                  unit:
                    unit.type === "String"
                      ? unescapeString(unit.value)
                      : unit.value.replace(/s$/, ""),
                },
              },
            ];
          } else {
            assertTerminalNode(child);

            switch (child.type) {
              case "Boolean":
                return [
                  {
                    kind: TokenKind.boolean,
                    value: child.value as "true" | "false",
                  },
                ];
              case "String":
                return [
                  {
                    kind: TokenKind.string,
                    value: unescapeString(child.value),
                  },
                ];
              case "Number":
                return [{ kind: TokenKind.number, value: child.value }];
              case "Date":
                return [
                  {
                    kind: TokenKind.date,
                    value: child.value.replace(/^@/, "") || "2000-01-01",
                  },
                ];
              case "Datetime":
                return [
                  {
                    kind: TokenKind.datetime,
                    value: child.value.replace(/^@/, "") || "2000-01-01",
                  },
                ];
              case "Time":
                return [
                  {
                    kind: TokenKind.time,
                    value: child.value.replace(/^@T/, "") || "00:00",
                  },
                ];
              case "Null":
                return [{ kind: TokenKind.null }];
              default:
                throw new Error(`Unknown literal type: ${child.type}`);
            }
          }
        }

        case "PolarityExpression": {
          assertNonTerminalNode(node);
          const [operator, operand] = node.children;

          if (!operator || !operand) {
            throw new Error(
              "Invalid PolarityExpression: missing operator or operand",
            );
          }

          if (isLezerTerminalNode(operator) && operator?.value === "+") {
            return operand ? walk(operand) : [];
          } else {
            if (operand?.type === "Literal") {
              assertNonTerminalNode(operand);
              if (operand.children[0]) {
                assertTerminalNode(operand.children[0]);
                operand.children[0].value = "-" + operand.children[0].value;
                return walk(operand);
              } else {
                return [{ kind: TokenKind.number, value: "0" }];
              }
            } else {
              return walk(makeAdditiveFromPolarity(operator, operand));
            }
          }
        }

        case "MultiplicativeExpression":
        case "AdditiveExpression":
        case "UnionExpression":
        case "InequalityExpression":
        case "EqualityExpression":
        case "TypeExpression":
        case "MembershipExpression":
        case "AndExpression":
        case "OrExpression":
        case "ImpliesExpression": {
          assertNonTerminalNode(node);
          const [leftNode, operator, rightNode] = node.children;

          if (!leftNode || !operator || !rightNode) {
            throw new Error(
              "Invalid operator expression: missing left, operator or right",
            );
          }

          assertTerminalNode(operator);

          let leftExpression = walk(leftNode);
          if (hasHigherPrecedence(node, leftNode)) {
            leftExpression = define({
              expression: leftExpression,
            });
          }

          let rightExpression = walk(rightNode);
          if (hasHigherPrecedence(node, rightNode)) {
            rightExpression = define({
              expression: rightExpression,
            });
          }

          return [
            ...leftExpression,
            { kind: TokenKind.operator, value: operator.value as OperatorName },
            ...rightExpression,
          ];
        }

        case "IndexerExpression": {
          assertNonTerminalNode(node);
          const [base, index] = node.children;
          if (index?.type !== "Literal") {
            throw new Error("Dynamic indexer is not supported");
          }
          assertNonTerminalNode(index);
          assertTerminalNode(index.children[0]);
          const value = index.children[0].value;

          return [
            ...(base ? walk(base) : []),
            { kind: TokenKind.index, value },
          ];
        }

        case "Identifier":
          assertTerminalNode(node);

          if (!node.value) {
            throw new Error("Identifier value is empty");
          }

          if (first && node.value[0]?.toUpperCase() === node.value[0]) {
            return [{ kind: TokenKind.type, value: ComplexType([node.value]) }];
          } else {
            return [{ kind: TokenKind.field, value: node.value }];
          }

        case "ExternalConstant": {
          assertNonTerminalNode(node);

          const [child] = node.children;
          assertTerminalNode(child);

          return [
            {
              kind: TokenKind.variable,
              value: unescapeIdentifier(child.value),
            },
          ];
        }

        case "TypeSpecifier": {
          assertNonTerminalNode(node);
          const elements = node.children.map((identifier) => {
            assertTerminalNode(identifier);
            return unescapeIdentifier(identifier.value);
          });

          const type =
            elements.length > 1
              ? ComplexType(elements)
              : elements[0]
                ? primitiveTypeMap[elements[0]] || standardTypeMap[elements[0]]
                : undefined;

          if (!type) {
            throw new Error(`Unknown type: ${elements[0]}`);
          }

          return [
            {
              kind: TokenKind.type,
              value: type,
            },
          ];
        }

        case "InvocationExpression": {
          if (node.comment === ANSWER_TOKEN_MARKER) {
            const linkId =
              matchNodeTemplate(valueTemplate, node) ||
              matchNodeTemplate(valueOfValueTemplate, node) ||
              matchNodeTemplate(ordinalOfValueTemplate, node);

            if (linkId) {
              return [
                { kind: TokenKind.answer, value: unescapeString(linkId) },
              ];
            }
          }

          assertNonTerminalNode(node);
          const [parent, target] = node.children;
          if (!parent || !target) {
            throw new Error(
              "Invalid InvocationExpression: missing parent or target",
            );
          }
          return [...walk(parent), ...walk(target, first)];
        }

        case "Function": {
          assertNonTerminalNode(node);
          const [name, params] = node.children;
          const args = isLezerNonTerminalNode(params) ? params.children : [];

          assertTerminalNode(name);
          if (name.value === "defineVariable") {
            const [name, expression] = args || [];
            if (
              name.type === "Literal" &&
              isLezerNonTerminalNode(name) &&
              isLezerTerminalNode(name.children[0]) &&
              name.children[0].value
            ) {
              define({
                expression: expression ? walk(expression) : [],
                name: unescapeString(name.children[0].value),
              });

              return [];
            } else {
              throw new Error(
                "Invalid defineVariable call: missing name argument",
              );
            }
          }

          if (name.value === "select" && first && args[0]) {
            return walk(args[0]);
          }

          return [
            {
              kind: TokenKind.function,
              value: unescapeIdentifier(name.value),
              args: args?.map((arg) => transformNode(arg)) || [],
            },
          ];
        }

        case "$this":
        case "$index":
          assertTerminalNode(node);
          return [
            {
              kind: TokenKind.variable,
              value: node.value.substring(1),
              special: true,
            },
          ];

        // todo support $total tokens
        default:
          throw new Error(`Unknown AST node type: ${node.type}`);
      }
    } catch (error) {
      console.error("Error processing node:", node, error);
      return [];
    }
  }

  return {
    bindings: bindings,
    expression: walk(node, true),
  };
}

export function parse(input: string): IProgram {
  const tree = parser.parse(input);
  const cursor = tree.cursor();

  const node = buildNode(cursor, input);

  if (!node) {
    throw new Error("Failed to parse input");
  }
  return transformNode(node);
}

const unparseNullToken = () => "{}";

const unparseNumberToken = (token: INumberToken) => token.value || "0";

const unparseStringToken = (token: IStringToken) => `'${token.value}'`;

const unparseBooleanToken = (token: IBooleanToken) => token.value;

const unparseDateToken = (token: IDateToken) => `@${token.value}`;

const unparseDateTimeToken = (token: IDateTimeToken) => `@${token.value}`;

const unparseTimeToken = (token: ITimeToken) => `@T${token.value}`;

const unparseQuantityToken = (token: IQuantityToken) => {
  const { value, unit } = token.value;
  return `${value || 0} '${unit || ""}'`;
};

export const unparseTypeToken = (token: ITypeToken) => {
  const primitive = typePrimitiveMap[token.value.name];

  if (primitive) {
    return primitive + "";
  } else if (token.value.name === TypeName.Complex) {
    return token.value.schemaReference.join(".");
  }

  return token.value.name + "";
};

const unparseIndexToken = (token: IIndexToken) => `[${token.value || 0}]`;

const unparseOperatorToken = (token: IOperatorToken) => {
  return ` ${token.value} `;
};

export const mocked = (name: string) => `mock/${name}`;

const unparseVariableToken = (
  token: IVariableToken,
  { mockSpecials }: UnparseContext,
) => {
  return token.special
    ? mockSpecials
      ? `%\`${mocked(`$${token.value}`)}\``
      : `$${token.value}`
    : `%${token.value}`;
};

const unparseFieldToken = (token: IFieldToken, { first }: UnparseContext) =>
  `${first ? "" : "."}${token.value}`;

const unparseAnswerToken = (
  token: IAnswerToken,
  { questionnaireItems }: UnparseContext,
) => {
  let base = `%resource.repeat(item).where(linkId = '${token.value}').answer.value`; // corresponds to valueTemplate

  switch (questionnaireItems[token.value]?.item.type) {
    case "choice":
    case "open-choice":
      base = `${base}.ordinal()`;
      break;
    case "quantity":
      base = `${base}.value`;
      break;
  }

  return `(${base} ${ANSWER_TOKEN_MARKER})`;
};

const unparseFunctionToken = (
  token: IFunctionToken,
  { first, ...context }: UnparseContext,
) => {
  const args = token.args
    ? token.args
        .map((arg) =>
          arg ? unparseProgram(arg, { ...context, mockSpecials: false }) : "{}",
        ) // consider: pass bindingsOrder for arg.bindings
        .join(", ")
    : "";
  return `${first ? "" : "."}${token.value}(${args})`;
};

const tokenUnparsers = {
  [TokenKind.null]: unparseNullToken,
  [TokenKind.number]: unparseNumberToken,
  [TokenKind.string]: unparseStringToken,
  [TokenKind.boolean]: unparseBooleanToken,
  [TokenKind.date]: unparseDateToken,
  [TokenKind.datetime]: unparseDateTimeToken,
  [TokenKind.time]: unparseTimeToken,
  [TokenKind.quantity]: unparseQuantityToken,
  [TokenKind.type]: unparseTypeToken,
  [TokenKind.index]: unparseIndexToken,
  [TokenKind.operator]: unparseOperatorToken,
  [TokenKind.variable]: unparseVariableToken,
  [TokenKind.field]: unparseFieldToken,
  [TokenKind.function]: unparseFunctionToken,
  [TokenKind.answer]: unparseAnswerToken,
} as const;

export const unparseExpression = (
  expression: Token[],
  context: UnparseContext,
) => {
  let result = "";

  for (let i = 0; i < expression.length; i++) {
    const token = expression[i];
    assertDefined(token);
    const stringifier = tokenUnparsers[token.kind] as (
      token: Token,
      context: UnparseContext,
    ) => string;
    if (stringifier) {
      result += stringifier(token, {
        ...context,
        first: i === 0 || expression[i - 1]?.kind === "operator",
      });
    }
  }
  return result.trim();
};

export const unparseBinding = (
  binding: LocalBinding,
  context: UnparseContext,
) => {
  return `defineVariable('${binding.name}'${
    binding.expression.length > 0
      ? `, ${unparseExpression(binding.expression, context)}`
      : ""
  })`;
};

export const unparseProgram = (program: IProgram, context: UnparseContext) => {
  let result = unparseExpression(program.expression, context);

  if (program.bindings.length > 0) {
    result = `${program.bindings
      .slice(0)
      .sort((a, b) => {
        return (
          (context.bindingsOrder[a.id] || 0) -
          (context.bindingsOrder[b.id] || 0)
        );
      })
      .map((binding) => unparseBinding(binding, context))
      .join(".\n")}${result ? `.\nselect(${result})` : ""}`;
  }

  return result;
};
