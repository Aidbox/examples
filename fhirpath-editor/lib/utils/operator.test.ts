import { describe, expect, test } from "vitest";
import * as sut from "./operator";
import {
  BooleanType,
  ChoiceType,
  DateTimeType,
  DateType,
  DecimalType,
  Generic,
  IntegerType,
  normalizeChoice,
  NullType,
  PrimitiveBooleanType,
  PrimitiveDecimalType,
  PrimitiveIntegerType,
  PrimitiveStringType,
  QuantityType,
  SingleType,
  StringType,
  TimeType,
  TypeType,
  UnknownType,
} from "./type";
import {
  GenericLetter,
  OperatorName,
  Type as IType,
  TypeName,
} from "../types/internal";

const B = Generic("B" as GenericLetter);
const X = Generic("X" as GenericLetter);

const expectInvalid = (result: IType) => {
  expect(result.name).toBe(TypeName.Invalid);
};

describe("operator", () => {
  describe("resolveOperator", () => {
    describe("Arithmetic Operators", () => {
      describe("'+' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(QuantityType),
            SingleType(IntegerType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(DecimalType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(StringType),
            SingleType(StringType),
            SingleType(StringType),
          ],

          [
            SingleType(DateType),
            SingleType(QuantityType),
            SingleType(DateType),
          ],
          [
            SingleType(DateTimeType),
            SingleType(QuantityType),
            SingleType(DateTimeType),
          ],
          [
            SingleType(TimeType),
            SingleType(QuantityType),
            SingleType(TimeType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(PrimitiveIntegerType),
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(PrimitiveDecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(PrimitiveDecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveIntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveDecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveStringType),
            SingleType(StringType),
            SingleType(StringType),
          ],
          [
            SingleType(StringType),
            SingleType(PrimitiveStringType),
            SingleType(StringType),
          ],
        ])("should resolve for %o + %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("+", l, r)).toEqual(expected);
        });
      });

      describe("'-' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(QuantityType),
            SingleType(IntegerType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(DecimalType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(DateType),
            SingleType(QuantityType),
            SingleType(DateType),
          ],
          [
            SingleType(DateTimeType),
            SingleType(QuantityType),
            SingleType(DateTimeType),
          ],
          [
            SingleType(TimeType),
            SingleType(QuantityType),
            SingleType(TimeType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveDecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveIntegerType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(PrimitiveDecimalType),
            SingleType(QuantityType),
          ],
        ])("should resolve for %o - %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("-", l, r)).toEqual(expected);
        });
      });

      describe("'*' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],

          [
            SingleType(QuantityType),
            SingleType(IntegerType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(DecimalType),
            SingleType(QuantityType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(PrimitiveIntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveIntegerType),
            SingleType(QuantityType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(PrimitiveIntegerType),
            SingleType(QuantityType),
          ],
        ])("should resolve for %o * %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("*", l, r)).toEqual(expected);
        });
      });

      describe("'/' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(QuantityType),
            SingleType(DecimalType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(QuantityType),
            SingleType(DecimalType),
          ],

          [
            SingleType(QuantityType),
            SingleType(IntegerType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(DecimalType),
            SingleType(QuantityType),
          ],
          [
            SingleType(QuantityType),
            SingleType(QuantityType),
            SingleType(DecimalType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveIntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveIntegerType),
            SingleType(QuantityType),
            SingleType(DecimalType),
          ],
          [
            SingleType(QuantityType),
            SingleType(PrimitiveDecimalType),
            SingleType(QuantityType),
          ],
        ])("should resolve for %o / %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("/", l, r)).toEqual(expected);
        });
      });

      describe("'mod' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(DecimalType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(DecimalType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveDecimalType),
            SingleType(DecimalType),
          ],
          [
            SingleType(PrimitiveDecimalType),
            SingleType(PrimitiveIntegerType),
            SingleType(DecimalType),
          ],
        ])("should resolve for %o mod %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("mod", l, r)).toEqual(expected);
        });
      });

      describe("'div' operator", () => {
        test.each([
          [
            SingleType(IntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(DecimalType),
            SingleType(IntegerType),
          ],

          [
            SingleType(DecimalType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(DecimalType),
            SingleType(DecimalType),
            SingleType(IntegerType),
          ],

          [
            SingleType(PrimitiveIntegerType),
            SingleType(IntegerType),
            SingleType(IntegerType),
          ],
          [
            SingleType(IntegerType),
            SingleType(PrimitiveDecimalType),
            SingleType(IntegerType),
          ],
          [
            SingleType(PrimitiveDecimalType),
            SingleType(PrimitiveDecimalType),
            SingleType(IntegerType),
          ],
        ])("should resolve for %o div %o to %o", (l, r, expected) => {
          expect(sut.resolveOperator("div", l, r)).toEqual(expected);
        });
      });

      test("invalid arithmetic operations", () => {
        expectInvalid(
          sut.resolveOperator(
            "+",
            SingleType(IntegerType),
            SingleType(StringType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "-",
            SingleType(StringType),
            SingleType(IntegerType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "*",
            SingleType(BooleanType),
            SingleType(IntegerType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "/",
            SingleType(DateType),
            SingleType(IntegerType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "mod",
            SingleType(StringType),
            SingleType(IntegerType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "div",
            SingleType(BooleanType),
            SingleType(IntegerType),
          ),
        );

        expectInvalid(
          sut.resolveOperator(
            "*",
            SingleType(QuantityType),
            SingleType(QuantityType),
          ),
        );
      });
    });

    describe("String Concatenation (&)", () => {
      test.each([
        [
          SingleType(StringType),
          SingleType(StringType),
          SingleType(StringType),
        ],
        [
          SingleType(PrimitiveStringType),
          SingleType(StringType),
          SingleType(StringType),
        ],
        [
          SingleType(StringType),
          SingleType(PrimitiveStringType),
          SingleType(StringType),
        ],
        [
          SingleType(PrimitiveStringType),
          SingleType(PrimitiveStringType),
          SingleType(StringType),
        ],
      ])("should resolve '&' for %o and %o to %o", (l, r, expected) => {
        expect(sut.resolveOperator("&", l, r)).toEqual(expected);
      });

      test("invalid string concatenation", () => {
        expectInvalid(
          sut.resolveOperator(
            "&",
            SingleType(StringType),
            SingleType(IntegerType),
          ),
        );
        expectInvalid(
          sut.resolveOperator(
            "&",
            SingleType(IntegerType),
            SingleType(StringType),
          ),
        );
      });
    });

    describe("Equality and Comparison Operators (=, !=, ~, !~, <, <=, >, >=)", () => {
      const comparisonOperators: OperatorName[] = [
        "=",
        "!=",
        "~",
        "!~",
        "<",
        "<=",
        ">",
        ">=",
      ];

      test.each(comparisonOperators)(
        "operator %s should resolve to Boolean for identical types",
        (op) => {
          expect(sut.resolveOperator(op, IntegerType, IntegerType)).toEqual(
            BooleanType,
          );
          expect(sut.resolveOperator(op, StringType, StringType)).toEqual(
            BooleanType,
          );
          expect(
            sut.resolveOperator(op, SingleType(DateType), SingleType(DateType)),
          ).toEqual(BooleanType);
          expect(sut.resolveOperator(op, NullType, NullType)).toEqual(
            BooleanType,
          );
          expect(sut.resolveOperator(op, UnknownType, UnknownType)).toEqual(
            BooleanType,
          );
        },
      );

      test.each(comparisonOperators)(
        "operator %s should resolve to Boolean when right is subtype of left's bound type",
        (op) => {
          expect(
            sut.resolveOperator(op, IntegerType, PrimitiveIntegerType),
          ).toEqual(BooleanType);

          expect(
            sut.resolveOperator(op, StringType, PrimitiveStringType),
          ).toEqual(BooleanType);
        },
      );

      test.each(comparisonOperators)(
        "operator %s should be Invalid if right is not subtype of left's bound type (strict T matching)",
        (op) => {
          expectInvalid(
            sut.resolveOperator(op, PrimitiveIntegerType, IntegerType),
          );

          expectInvalid(sut.resolveOperator(op, IntegerType, StringType));

          expectInvalid(sut.resolveOperator(op, IntegerType, DecimalType));
        },
      );

      test.each(comparisonOperators)(
        "operator %s with NullType and other type",
        (op) => {
          expectInvalid(sut.resolveOperator(op, IntegerType, NullType));

          expectInvalid(sut.resolveOperator(op, NullType, StringType));
        },
      );

      test.each(comparisonOperators)(
        "operator %s with UnknownType and other concrete type",
        (op) => {
          expectInvalid(sut.resolveOperator(op, IntegerType, UnknownType));
          expectInvalid(sut.resolveOperator(op, UnknownType, IntegerType));
        },
      );
    });

    describe("Membership Operators (in, contains)", () => {
      test("'in' operator", () => {
        expect(
          sut.resolveOperator("in", SingleType(IntegerType), IntegerType),
        ).toEqual(BooleanType);

        expect(
          sut.resolveOperator(
            "in",
            SingleType(IntegerType),
            SingleType(IntegerType),
          ),
        ).toEqual(BooleanType);

        expectInvalid(
          sut.resolveOperator(
            "in",
            SingleType(PrimitiveIntegerType),
            IntegerType,
          ),
        );

        expect(
          sut.resolveOperator(
            "in",
            SingleType(IntegerType),
            PrimitiveIntegerType,
          ),
        ).toEqual(BooleanType);

        expectInvalid(
          sut.resolveOperator("in", SingleType(StringType), IntegerType),
        );

        expectInvalid(
          sut.resolveOperator(
            "in",
            SingleType(IntegerType),
            ChoiceType([StringType, BooleanType]),
          ),
        );

        expect(
          sut.resolveOperator(
            "in",
            SingleType(ChoiceType([StringType, BooleanType])),
            ChoiceType([StringType, BooleanType]),
          ),
        ).toEqual(BooleanType);
      });

      test("'contains' operator", () => {
        expect(
          sut.resolveOperator("contains", IntegerType, SingleType(IntegerType)),
        ).toEqual(BooleanType);

        expect(
          sut.resolveOperator(
            "contains",
            SingleType(IntegerType),
            SingleType(IntegerType),
          ),
        ).toEqual(BooleanType);

        expect(
          sut.resolveOperator(
            "contains",
            IntegerType,
            SingleType(PrimitiveIntegerType),
          ),
        ).toEqual(BooleanType);

        expectInvalid(
          sut.resolveOperator(
            "contains",
            PrimitiveIntegerType,
            SingleType(IntegerType),
          ),
        );

        expectInvalid(
          sut.resolveOperator("contains", StringType, SingleType(IntegerType)),
        );

        expect(
          sut.resolveOperator(
            "contains",
            ChoiceType([StringType, BooleanType]),
            SingleType(ChoiceType([StringType, BooleanType])),
          ),
        ).toEqual(BooleanType);
      });
    });

    describe("Logical Operators (and, or, xor, implies)", () => {
      const logicalOperators: OperatorName[] = ["and", "or", "xor", "implies"];
      test.each(logicalOperators)(
        "operator %s should resolve to Boolean for Boolean operands",
        (op) => {
          expect(
            sut.resolveOperator(
              op,
              SingleType(BooleanType),
              SingleType(BooleanType),
            ),
          ).toEqual(BooleanType);

          expect(
            sut.resolveOperator(
              op,
              SingleType(PrimitiveBooleanType),
              SingleType(BooleanType),
            ),
          ).toEqual(BooleanType);
          expect(
            sut.resolveOperator(
              op,
              SingleType(BooleanType),
              SingleType(PrimitiveBooleanType),
            ),
          ).toEqual(BooleanType);
          expect(
            sut.resolveOperator(
              op,
              SingleType(PrimitiveBooleanType),
              SingleType(PrimitiveBooleanType),
            ),
          ).toEqual(BooleanType);
        },
      );

      test.each(logicalOperators)(
        "operator %s should be Invalid for non-Boolean operands",
        (op) => {
          expectInvalid(
            sut.resolveOperator(
              op,
              SingleType(BooleanType),
              SingleType(IntegerType),
            ),
          );
          expectInvalid(
            sut.resolveOperator(
              op,
              SingleType(StringType),
              SingleType(BooleanType),
            ),
          );
        },
      );
    });

    describe("Union Operator (|)", () => {
      test("union with identical types", () => {
        expect(sut.resolveOperator("|", IntegerType, IntegerType)).toEqual(
          IntegerType,
        );
        expect(sut.resolveOperator("|", StringType, StringType)).toEqual(
          StringType,
        );
      });

      test("union with promotable types", () => {
        expect(sut.resolveOperator("|", IntegerType, DecimalType)).toEqual(
          DecimalType,
        );
        expect(sut.resolveOperator("|", DecimalType, IntegerType)).toEqual(
          DecimalType,
        );
        expect(
          sut.resolveOperator("|", PrimitiveIntegerType, DecimalType),
        ).toEqual(DecimalType);
        expect(sut.resolveOperator("|", IntegerType, QuantityType)).toEqual(
          QuantityType,
        );
      });

      test("union with non-promotable types creates ChoiceType", () => {
        expect(sut.resolveOperator("|", StringType, BooleanType)).toEqual(
          ChoiceType([StringType, BooleanType]),
        );
        expect(sut.resolveOperator("|", IntegerType, StringType)).toEqual(
          ChoiceType([IntegerType, StringType]),
        );
      });

      test("union with ChoiceType operands", () => {
        const choiceIS = ChoiceType([IntegerType, StringType]);

        expect(sut.resolveOperator("|", choiceIS, BooleanType)).toEqual(
          ChoiceType([BooleanType, IntegerType, StringType]),
        );

        expect(
          sut.resolveOperator(
            "|",
            IntegerType,
            ChoiceType([StringType, BooleanType]),
          ),
        ).toEqual(ChoiceType([IntegerType, StringType, BooleanType]));

        const choiceBD = ChoiceType([BooleanType, DateType]);
        expect(sut.resolveOperator("|", choiceIS, choiceBD)).toEqual(
          ChoiceType([IntegerType, StringType, BooleanType, DateType]),
        );

        const choiceSBI = ChoiceType([StringType, BooleanType, IntegerType]);
        expect(
          sut.resolveOperator(
            "|",
            ChoiceType([StringType, BooleanType]),
            ChoiceType([BooleanType, IntegerType]),
          ),
        ).toEqual(choiceSBI);
      });

      test("union involving NullType", () => {
        expect(sut.resolveOperator("|", IntegerType, NullType)).toEqual(
          ChoiceType([IntegerType, NullType]),
        );

        const choiceIS = ChoiceType([IntegerType, StringType]);
        expect(sut.resolveOperator("|", choiceIS, NullType)).toEqual(
          ChoiceType([NullType, IntegerType, StringType]),
        );
      });
    });

    describe("Type Operators (is, as)", () => {
      test("'is' operator", () => {
        expect(
          sut.resolveOperator("is", IntegerType, TypeType(IntegerType)),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator("is", StringType, TypeType(IntegerType)),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator(
            "is",
            PrimitiveIntegerType,
            TypeType(IntegerType),
          ),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator("is", IntegerType, TypeType(StringType)),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator("is", UnknownType, TypeType(IntegerType)),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator("is", IntegerType, TypeType(UnknownType)),
        ).toEqual(BooleanType);
        expect(
          sut.resolveOperator(
            "is",
            ChoiceType([StringType, BooleanType]),
            TypeType(BooleanType),
          ),
        ).toEqual(BooleanType);

        const typeChoiceSB = TypeType(ChoiceType([StringType, BooleanType]));
        expect(sut.resolveOperator("is", IntegerType, typeChoiceSB)).toEqual(
          BooleanType,
        );
      });

      test("'is' operator invalid right operand", () => {
        expectInvalid(sut.resolveOperator("is", IntegerType, StringType));
        expectInvalid(sut.resolveOperator("is", IntegerType, IntegerType));
      });

      test("'as' operator", () => {
        expect(
          sut.resolveOperator("as", IntegerType, TypeType(StringType)),
        ).toEqual(StringType);
        expect(
          sut.resolveOperator("as", StringType, TypeType(IntegerType)),
        ).toEqual(IntegerType);
        expect(
          sut.resolveOperator(
            "as",
            PrimitiveIntegerType,
            TypeType(IntegerType),
          ),
        ).toEqual(IntegerType);
        expect(
          sut.resolveOperator("as", IntegerType, TypeType(DateType)),
        ).toEqual(DateType);
        expect(
          sut.resolveOperator(
            "as",
            ChoiceType([StringType, BooleanType]),
            TypeType(IntegerType),
          ),
        ).toEqual(IntegerType);
        expect(
          sut.resolveOperator("as", IntegerType, TypeType(UnknownType)),
        ).toEqual(UnknownType);
        expect(
          sut.resolveOperator("as", UnknownType, TypeType(StringType)),
        ).toEqual(StringType);
        const typeChoiceSB = TypeType(ChoiceType([StringType, BooleanType]));
        expect(sut.resolveOperator("as", IntegerType, typeChoiceSB)).toEqual(
          ChoiceType([StringType, BooleanType]),
        );
      });

      test("'as' operator invalid right operand", () => {
        expectInvalid(sut.resolveOperator("as", IntegerType, StringType));
        expectInvalid(sut.resolveOperator("as", IntegerType, IntegerType));
      });
    });

    describe("Invalid Operator or General Mismatch", () => {
      test("unknown operator", () => {
        const result = sut.resolveOperator(
          "unknownOp" as OperatorName,
          IntegerType,
          IntegerType,
        );
        expect(result.name).toBe(TypeName.Invalid);
        if (result.name === TypeName.Invalid) {
          expect(result.error).toContain("No matching overload");
        }
      });

      test("type mismatch for all overloads of a known operator", () => {
        const result = sut.resolveOperator("+", DateType, DateTimeType);
        expect(result.name).toBe(TypeName.Invalid);
        if (result.name === TypeName.Invalid) {
          expect(result.error).toContain("No matching overload");
        }

        const result2 = sut.resolveOperator(
          "-",
          SingleType(BooleanType),
          SingleType(IntegerType),
        );
        expectInvalid(result2);
      });
    });
  });

  describe("suggestOperatorsForLeftType", () => {
    test("for IntegerType", () => {
      const suggestions = sut.suggestOperatorsForLeftType(IntegerType);
      const suggestedNames = suggestions.map((s) => s.name);

      expect(suggestedNames).not.toContain("+");
      expect(suggestedNames).toContain("=");
      expect(suggestedNames).toContain("is");
      expect(suggestedNames).toContain("|");
      expect(suggestedNames).toContain("contains");
      expect(suggestedNames).not.toContain("in");
    });

    test("for SingleType(IntegerType)", () => {
      const suggestions = sut.suggestOperatorsForLeftType(
        SingleType(IntegerType),
      );
      const suggestedNames = suggestions.map((s) => s.name);
      expect(suggestedNames).toContain("+");
      expect(suggestedNames).toContain("-");
      expect(suggestedNames).toContain("*");
      expect(suggestedNames).toContain("/");
      expect(suggestedNames).toContain("mod");
      expect(suggestedNames).toContain("div");
      expect(suggestedNames).toContain("in");
      expect(suggestedNames).toContain("=");
      expect(suggestedNames).toContain("is");
      expect(suggestedNames).toContain("|");
    });

    test("for StringType", () => {
      const suggestions = sut.suggestOperatorsForLeftType(StringType);
      const suggestedNames = suggestions.map((s) => s.name);
      expect(suggestedNames).not.toContain("&");
      expect(suggestedNames).not.toContain("+");
      expect(suggestedNames).toContain("=");
      expect(suggestedNames).toContain("is");
      expect(suggestedNames).toContain("|");
    });

    test("for SingleType(StringType)", () => {
      const suggestions = sut.suggestOperatorsForLeftType(
        SingleType(StringType),
      );
      const suggestedNames = suggestions.map((s) => s.name);
      expect(suggestedNames).toContain("&");
      expect(suggestedNames).toContain("+");
      expect(suggestedNames).toContain("=");
      expect(suggestedNames).toContain("is");
      expect(suggestedNames).toContain("|");
      expect(suggestedNames).toContain("in");
    });

    test("for ChoiceType", () => {
      const suggestions = sut.suggestOperatorsForLeftType(
        ChoiceType([StringType, BooleanType]),
      );
      const suggestedNames = suggestions.map((s) => s.name);

      expect(suggestedNames).toContain("=");
      expect(suggestedNames).toContain("is");
      expect(suggestedNames).toContain("|");
      expect(suggestedNames).toContain("contains");
      expect(suggestedNames).not.toContain("+");
      expect(suggestedNames).not.toContain("in");
    });
  });

  describe("suggestRightTypesForOperator", () => {
    test("for '+' with left SingleInt", () => {
      const suggestions = sut.suggestRightTypesForOperator(
        "+",
        SingleType(IntegerType),
      );

      const expectedPlus = normalizeChoice(
        ChoiceType([
          SingleType(IntegerType),
          SingleType(DecimalType),
          SingleType(QuantityType),
        ]),
      );
      expect(suggestions).toEqual(expectedPlus);
    });

    test("for '+' with left SingleStr", () => {
      const suggestions = sut.suggestRightTypesForOperator(
        "+",
        SingleType(StringType),
      );

      expect(suggestions).toEqual(SingleType(StringType));
    });

    test("for '=' with left Integer", () => {
      const suggestions = sut.suggestRightTypesForOperator("=", IntegerType);
      expect(suggestions).toEqual(IntegerType);
    });

    test("for '|' with left String", () => {
      const suggestions = sut.suggestRightTypesForOperator("|", StringType);
      expect(suggestions).toEqual(B);
    });

    test("for 'is' with left Decimal", () => {
      const suggestions = sut.suggestRightTypesForOperator("is", DecimalType);
      expect(suggestions).toEqual(TypeType(X));
    });

    test("for 'in' with left SingleStr", () => {
      const suggestions = sut.suggestRightTypesForOperator(
        "in",
        SingleType(StringType),
      );
      expect(suggestions).toEqual(StringType);
    });

    test("for 'as' with left Quantity", () => {
      const suggestions = sut.suggestRightTypesForOperator("as", QuantityType);
      expect(suggestions).toEqual(TypeType(X));
    });

    test("should return empty Choice if no ops match", () => {
      const suggestions = sut.suggestRightTypesForOperator(
        "mod",
        SingleType(StringType),
      );
      expect(suggestions).toEqual(ChoiceType([]));
    });
  });
});
