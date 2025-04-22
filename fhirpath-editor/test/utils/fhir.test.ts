import { describe, expect, it } from "vitest";

import { stringifyExpression, stringifyProgram } from "@/utils/stringify";
import {
  TokenType,
  INumberToken,
  IStringToken,
  IBooleanToken,
  IDateToken,
  IDateTimeToken,
  ITimeToken,
  IQuantityToken,
  ITypeToken,
  IVariableToken,
  IIndexToken,
  IOperatorToken,
  IFieldToken,
  IType,
} from "@/types/internal";

describe("FHIRPath conversion", () => {
  const defaultContext = {
    type: { type: "String" },
    value: null,
    questionnaireItems: {},
    bindingsOrder: {},
  };

  it("should convert number token", () => {
    const expression: INumberToken[] = [
      { type: TokenType.number, value: "423.14" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("423.14");
  });

  it("should convert string token", () => {
    const expression: IStringToken[] = [
      { type: TokenType.string, value: "hello" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("'hello'");
  });

  it("should convert boolean token", () => {
    const expression: (IBooleanToken | IOperatorToken)[] = [
      { type: TokenType.boolean, value: "true" },
      { type: TokenType.operator, value: "and" },
      { type: TokenType.boolean, value: "false" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "true and false",
    );
  });

  it("should convert date token", () => {
    const expression: IDateToken[] = [
      { type: TokenType.date, value: "2023-05-15" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("@2023-05-15");
  });

  it("should convert datetime token", () => {
    const expression: IDateTimeToken[] = [
      { type: TokenType.datetime, value: "2023-05-15T14:30:00" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "@2023-05-15T14:30:00",
    );
  });

  it("should convert time token", () => {
    const expression: ITimeToken[] = [
      { type: TokenType.time, value: "14:30:00" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("@T14:30:00");
  });

  it("should convert quantity token", () => {
    const expression: IQuantityToken[] = [
      { type: TokenType.quantity, value: { value: "70", unit: "kg" } },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("70 'kg'");
  });

  it("should convert null quantity token", () => {
    const expression: IQuantityToken[] = [
      { type: TokenType.quantity, value: { value: "0", unit: "" } },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("0 ''");
  });

  it("should convert variable token", () => {
    const expression: IVariableToken[] = [
      { type: TokenType.variable, value: "patient" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("%patient");
  });

  it("should convert field token", () => {
    const expression: (IVariableToken | IFieldToken)[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "name" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "%patient.name",
    );
  });

  it("should convert operator token", () => {
    const eqExpression: (IVariableToken | IOperatorToken | INumberToken)[] = [
      { type: TokenType.variable, value: "age" },
      { type: TokenType.operator, value: "=" },
      { type: TokenType.number, value: "42" },
    ];
    expect(stringifyExpression(eqExpression, defaultContext)).toBe("%age = 42");

    const concatExpression: (IStringToken | IOperatorToken)[] = [
      { type: TokenType.string, value: "Hello" },
      { type: TokenType.operator, value: "&" },
      { type: TokenType.string, value: "World" },
    ];
    expect(stringifyExpression(concatExpression, defaultContext)).toBe(
      "'Hello' & 'World'",
    );

    const otherOperators: (INumberToken | IOperatorToken)[] = [
      { type: TokenType.number, value: "10" },
      { type: TokenType.operator, value: ">" },
      { type: TokenType.number, value: "5" },
    ];
    expect(stringifyExpression(otherOperators, defaultContext)).toBe("10 > 5");
  });

  it("should convert complex expression", () => {
    const complexExpression: (
      | IVariableToken
      | IFieldToken
      | IOperatorToken
      | IQuantityToken
      | IStringToken
    )[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "age" },
      { type: TokenType.operator, value: ">" },
      { type: TokenType.quantity, value: { value: "18", unit: "years" } },
      { type: TokenType.operator, value: "and" },
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "gender" },
      { type: TokenType.operator, value: "=" },
      { type: TokenType.string, value: "male" },
    ];
    expect(stringifyExpression(complexExpression, defaultContext)).toBe(
      "%patient.age > 18 'years' and %patient.gender = 'male'",
    );
  });

  it("should convert program with bindings", () => {
    const program = {
      expression: [
        { type: TokenType.variable, value: "age" },
      ] as IVariableToken[],
      bindings: [
        {
          id: "binding1",
          name: "age",
          expression: [
            { type: TokenType.number, value: "42" },
          ] as INumberToken[],
        },
      ],
    };
    expect(stringifyProgram(program, defaultContext)).toBe(
      "defineVariable('age', 42).\nselect(%age)",
    );
  });

  it("should convert type token", () => {
    const expression: ITypeToken[] = [
      { type: TokenType.type, value: { type: "String" } as IType },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe("String");
  });

  it("should convert is operator with type", () => {
    const expression: (
      | IVariableToken
      | IFieldToken
      | IOperatorToken
      | ITypeToken
    )[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "name" },
      { type: TokenType.operator, value: "is" },
      { type: TokenType.type, value: { type: "String" } as IType },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "%patient.name is String",
    );
  });

  it("should convert as operator with type", () => {
    const expression: (
      | IVariableToken
      | IFieldToken
      | IOperatorToken
      | ITypeToken
    )[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "age" },
      { type: TokenType.operator, value: "as" },
      { type: TokenType.type, value: { type: "Decimal" } as IType },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "%patient.age as Decimal",
    );
  });

  it("should convert index token", () => {
    const expression: (IVariableToken | IFieldToken | IIndexToken)[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "name" },
      { type: TokenType.index, value: "0" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "%patient.name[0]",
    );
  });

  it("should convert nested index token", () => {
    const expression: (IVariableToken | IFieldToken | IIndexToken)[] = [
      { type: TokenType.variable, value: "patient" },
      { type: TokenType.field, value: "name" },
      { type: TokenType.index, value: "0" },
      { type: TokenType.field, value: "given" },
      { type: TokenType.index, value: "0" },
    ];
    expect(stringifyExpression(expression, defaultContext)).toBe(
      "%patient.name[0].given[0]",
    );
  });
});
