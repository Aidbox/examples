import { TreeCursor } from "@lezer/common";
import { parser } from "lezer-fhirpath";
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
  LocalBinding,
  OperatorName,
  Token,
  TokenType,
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

function buildNode(cursor: TreeCursor, input: string): LezerNode | null {
  const type = cursor.node.type.name;
  const value = input.slice(cursor.from, cursor.to);

  // Skip certain token types
  if (
    type === "(" ||
    type === ")" ||
    type === "[" ||
    type === "]" ||
    type === "," ||
    type === "." ||
    type === "%" ||
    type === "⚠" ||
    type === "LineComment" ||
    type === "BlockComment"
  ) {
    return null;
  }

  const children: LezerNode[] = [];

  // Process children
  if (cursor.firstChild()) {
    do {
      const child = buildNode(cursor, input);

      if (child) {
        children.push(child);
      }
    } while (cursor.nextSibling());
    cursor.parent();
  }

  if (
    type === "Identifier" &&
    children.length === 1 &&
    children[0].type === "DelimitedIdentifier"
  ) {
    return {
      type: "Identifier",
      value: children[0].value,
      children: [],
    };
  }

  return { type, value, children };
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
    value: "0",
    children: [{ type: "Number", value: "0", children: [] }],
  };

  return {
    type: "AdditiveExpression",
    value: `${zero.value} ${operator.value} ${operand.value}`,
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
    precedence[a.type] > precedence[b.type]
  );
}

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
    if (expression.length === 1 && expression[0].type === TokenType.variable)
      return expression;
    if (name && bindings.find((b) => b.name === name))
      return [{ type: TokenType.variable, value: name }];
    const binding: LocalBinding = {
      id: generateBindingId(),
      name: name || `var${++varCounter}`,
      expression,
    };
    bindings.push(binding);
    return [{ type: TokenType.variable, value: binding.name }];
  }

  function walk(node: LezerNode, first = false): Token[] {
    if (!node) return [];
    const { type, value, children } = node;

    switch (type) {
      case "Document": {
        return walk(children[0], true);
      }

      case "Literal": {
        const { type, value, children: parts } = children[0];

        switch (type) {
          case "Boolean":
            return [
              { type: TokenType.boolean, value: value as "true" | "false" },
            ];
          case "String":
            return [{ type: TokenType.string, value: unescapeString(value) }];
          case "Number":
            return [{ type: TokenType.number, value: value }];
          case "Datetime":
            return [
              { type: TokenType.datetime, value: value.replace(/^@/, "") },
            ];
          case "Time":
            return [{ type: TokenType.time, value: value.replace(/^@T/, "") }];
          case "Quantity": {
            const unit = parts[1].children[0];
            return [
              {
                type: TokenType.quantity,
                value: {
                  value: parts[0].value,
                  unit:
                    unit.type === "String"
                      ? unescapeString(unit.value)
                      : unit.value.replace(/s$/, ""),
                },
              },
            ];
          }
          // todo: support empty literal
          default:
            throw new Error(`Unknown literal type: ${type}`);
        }
      }

      case "PolarityExpression": {
        const [operator, operand] = children;

        if (operator.value === "+") {
          return walk(operand);
        } else {
          if (operand.type === "Literal") {
            operand.children[0].value = "-" + operand.children[0].value;
            return walk(operand);
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
        const [leftNode, { value: operator }, rightNode] = children;

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
          { type: TokenType.operator, value: operator as OperatorName },
          ...rightExpression,
        ];
      }

      case "IndexerExpression": {
        if (children[1].type !== "Literal") {
          throw new Error("Expected Literal for indexer expression");
        }
        return [
          ...walk(children[0]),
          { type: TokenType.index, value: children[1].value },
        ];
      }

      case "Identifier":
        return [{ type: TokenType.field, value }]; // todo: generate TokenType.type if value is a FhirResource type and if first = true

      case "ExternalConstant":
        return [
          {
            type: TokenType.variable,
            value: unescapeIdentifier(children[0].value),
          },
        ];

      case "TypeSpecifier": {
        const elements = children[0].children.map((identifier) =>
          unescapeIdentifier(identifier.value),
        );

        const type =
          elements.length > 1
            ? ComplexType(elements)
            : primitiveTypeMap[elements[0]] || standardTypeMap[elements[0]];

        if (!type) {
          throw new Error(`Unknown type: ${elements[0]}`);
        }

        return [
          {
            type: TokenType.type,
            value: type,
          },
        ];
      }

      case "InvocationExpression": {
        const [parent, target] = children;
        return [...walk(parent), ...walk(target, first)];
      }

      case "Function": {
        const [{ value: name }, params] = children;
        const { children: args } = params || { children: [] };

        if (name === "defineVariable") {
          const [name, expression] = args;
          define({
            expression: walk(expression),
            name: unescapeString(name.value),
          });
          return [];
        }

        if (name === "select" && first) {
          return walk(args[0]);
        }

        return [
          {
            type: TokenType.function,
            value: unescapeIdentifier(name),
            args: args.map((arg) => transformNode(arg)),
          },
        ];
      }

      // todo support $this tokens
      // todo support $index tokens
      // todo support $total tokens
      default:
        throw new Error(`Unknown AST node type: ${type}`);
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
  const primitive = typePrimitiveMap[token.value.type];

  if (primitive) {
    return primitive + "";
  } else if (token.value.type === TypeName.Complex) {
    return token.value.schemaReference.join(".");
  }

  return token.value.type + "";
};

const unparseIndexToken = (token: IIndexToken) => `[${token.value || 0}]`;

const unparseOperatorToken = (token: IOperatorToken) => {
  return ` ${token.value} `;
};

const unparseVariableToken = (token: IVariableToken) => {
  return `%${token.value}`;
};

const unparseFieldToken = (token: IFieldToken, { first }: UnparseContext) =>
  `${first ? "" : "."}${token.value}`;

const unparseAnswerToken = (
  token: IAnswerToken,
  { first, questionnaireItems }: UnparseContext,
) => {
  const base = `${first ? "" : "."}repeat(item).where(linkId = '${token.value}').answer.value`;

  switch (questionnaireItems[token.value]?.item.type) {
    case "choice":
    case "open-choice":
      return `${base}.ordinal()`;
    case "quantity":
      return `${base}.value`;
    default:
      return base;
  }
};

const unparseFunctionToken = (
  token: IFunctionToken,
  { first, ...context }: UnparseContext,
) => {
  const args = token.args
    ? token.args
        .map((arg) => (arg ? unparseProgram(arg, context) : "{}")) // todo: pass inner bindingsOrder
        .join(", ")
    : "";
  return `${first ? "" : "."}${token.value}(${args})`;
};

const tokenUnparsers = {
  [TokenType.number]: unparseNumberToken,
  [TokenType.string]: unparseStringToken,
  [TokenType.boolean]: unparseBooleanToken,
  [TokenType.date]: unparseDateToken,
  [TokenType.datetime]: unparseDateTimeToken,
  [TokenType.time]: unparseTimeToken,
  [TokenType.quantity]: unparseQuantityToken,
  [TokenType.type]: unparseTypeToken,
  [TokenType.index]: unparseIndexToken,
  [TokenType.operator]: unparseOperatorToken,
  [TokenType.variable]: unparseVariableToken,
  [TokenType.field]: unparseFieldToken,
  [TokenType.function]: unparseFunctionToken,
  [TokenType.answer]: unparseAnswerToken,
} as const;

export const unparseExpression = (
  expression: Token[],
  context: UnparseContext,
) => {
  let result = "";

  for (let i = 0; i < expression.length; i++) {
    const token = expression[i];
    const stringifier = tokenUnparsers[token.type] as (
      token: Token,
      context: UnparseContext,
    ) => string;
    if (stringifier) {
      result += stringifier(token, {
        ...context,
        first: i === 0 || expression[i - 1].type === "operator",
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
        return context.bindingsOrder[a.id] - context.bindingsOrder[b.id];
      })
      .map((binding) => unparseBinding(binding, context))
      .join(".\n")}.\nselect(${result})`;
  }

  return result;
};
