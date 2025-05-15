import { describe, expect, test } from "vitest";
import * as sut from "./type"; // Assuming your file is named type.ts
import {
  GenericLetter,
  IChoiceType,
  ISingleType,
  Type,
  TypeName,
} from "../types/internal"; // Assuming types are in internal

// --- Test Data Setup ---

const T = sut.Generic("T");
const U = sut.Generic("U");
const V = sut.Generic("V");

// --- Tests ---

describe("type", () => {
  // Note: Hierarchy is built implicitly by type definitions in the module

  describe("isSubtypeOf", () => {
    test("should return true for the same type", () => {
      expect(sut.isSubtypeOf(sut.IntegerType, sut.IntegerType)).toBe(true);
      expect(
        sut.isSubtypeOf(sut.PrimitiveStringType, sut.PrimitiveStringType),
      ).toBe(true);
    });

    test("should return false if expected type is Unknown", () => {
      expect(sut.isSubtypeOf(sut.IntegerType, sut.UnknownType)).toBe(false);
      expect(sut.isSubtypeOf(sut.PrimitiveBooleanType, sut.UnknownType)).toBe(
        false,
      );
      expect(
        sut.isSubtypeOf(sut.ComplexType(["Patient"]), sut.UnknownType),
      ).toBe(false);
      expect(
        sut.isSubtypeOf(sut.ChoiceType([sut.IntegerType]), sut.UnknownType),
      ).toBe(false);
      expect(
        sut.isSubtypeOf(sut.SingleType(sut.IntegerType), sut.UnknownType),
      ).toBe(false);
    });

    test("should return false if actual type is Unknown but expected is not", () => {
      expect(sut.isSubtypeOf(sut.UnknownType, sut.IntegerType)).toBe(false);
      expect(
        sut.isSubtypeOf(sut.UnknownType, sut.ChoiceType([sut.IntegerType])),
      ).toBe(false);
    });

    test("should return true for direct subtypes (primitive vs standard)", () => {
      expect(sut.isSubtypeOf(sut.PrimitiveStringType, sut.StringType)).toBe(
        true,
      );
      expect(sut.isSubtypeOf(sut.PrimitiveIntegerType, sut.IntegerType)).toBe(
        true,
      );
      expect(sut.isSubtypeOf(sut.PrimitiveDecimalType, sut.DecimalType)).toBe(
        true,
      );
      expect(sut.isSubtypeOf(sut.PrimitiveBooleanType, sut.BooleanType)).toBe(
        true,
      );
      expect(sut.isSubtypeOf(sut.PrimitiveDateType, sut.DateType)).toBe(true);
      expect(sut.isSubtypeOf(sut.PrimitiveDateTimeType, sut.DateTimeType)).toBe(
        true,
      );
      expect(sut.isSubtypeOf(sut.PrimitiveTimeType, sut.TimeType)).toBe(true);
    });

    test("should return true for specific integer subtypes", () => {
      expect(
        sut.isSubtypeOf(sut.PrimitivePositiveIntegerType, sut.IntegerType),
      ).toBe(true);
      expect(
        sut.isSubtypeOf(sut.PrimitiveUnsignedIntegerType, sut.IntegerType),
      ).toBe(true);
    });

    test("should return false for unrelated types", () => {
      expect(sut.isSubtypeOf(sut.IntegerType, sut.StringType)).toBe(false);
      expect(sut.isSubtypeOf(sut.StringType, sut.BooleanType)).toBe(false);
      expect(
        sut.isSubtypeOf(sut.PrimitiveDateType, sut.PrimitiveDateTimeType),
      ).toBe(false);
      expect(
        sut.isSubtypeOf(sut.SingleType(sut.IntegerType), sut.IntegerType),
      ).toBe(false);
      expect(
        sut.isSubtypeOf(sut.IntegerType, sut.SingleType(sut.IntegerType)),
      ).toBe(false);
      expect(
        sut.isSubtypeOf(sut.ChoiceType([sut.IntegerType]), sut.IntegerType),
      ).toBe(false);
    });

    test("should return false when expected is a subtype of actual", () => {
      expect(sut.isSubtypeOf(sut.StringType, sut.PrimitiveStringType)).toBe(
        false,
      );
      expect(sut.isSubtypeOf(sut.IntegerType, sut.PrimitiveIntegerType)).toBe(
        false,
      );
    });
  });

  describe("unwrapSingle", () => {
    test("should return the inner type for SingleType", () => {
      const singleInt = sut.SingleType(sut.IntegerType);
      expect(sut.unwrapSingle(singleInt)).toEqual(sut.IntegerType);
      const singleChoice = sut.SingleType(sut.ChoiceType([sut.StringType]));
      expect(sut.unwrapSingle(singleChoice)).toEqual(
        sut.ChoiceType([sut.StringType]),
      );
    });

    test("should return the type itself if not SingleType", () => {
      expect(sut.unwrapSingle(sut.StringType)).toEqual(sut.StringType);
      expect(sut.unwrapSingle(sut.UnknownType)).toEqual(sut.UnknownType);
      const choice = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(sut.unwrapSingle(choice)).toEqual(choice);
      expect(sut.unwrapSingle(T)).toEqual(T);
    });

    test("should return undefined/null if input is undefined/null", () => {
      expect(sut.unwrapSingle(undefined as any as Type)).toBeUndefined();
      expect(sut.unwrapSingle(null as any as Type)).toBeNull();
    });
  });

  describe("normalizeChoice", () => {
    test("should return the single option if only one unique type", () => {
      const choice = sut.ChoiceType([sut.IntegerType]);
      expect(sut.normalizeChoice(choice)).toEqual(sut.IntegerType);
      const choiceSingle = sut.ChoiceType([sut.SingleType(sut.BooleanType)]);
      expect(sut.normalizeChoice(choiceSingle)).toEqual(
        sut.SingleType(sut.BooleanType),
      );
    });

    test("should deduplicate identical options", () => {
      const choice = sut.ChoiceType([
        sut.IntegerType,
        sut.StringType,
        sut.IntegerType,
      ]);
      const result = sut.normalizeChoice(choice) as IChoiceType;
      expect(result.name).toBe(TypeName.Choice);
      expect(result.options).toHaveLength(2);
      expect(result.options).toContainEqual(sut.IntegerType);
      expect(result.options).toContainEqual(sut.StringType);
    });

    test("should deduplicate structurally identical options like Single or Lambda", () => {
      const choice1 = sut.ChoiceType([
        sut.SingleType(sut.IntegerType),
        sut.StringType,
        sut.SingleType(sut.IntegerType),
      ]);
      const result1 = sut.normalizeChoice(choice1) as IChoiceType;
      expect(result1.name).toBe(TypeName.Choice);
      expect(result1.options).toHaveLength(2);
      expect(result1.options).toContainEqual(sut.SingleType(sut.IntegerType));
      expect(result1.options).toContainEqual(sut.StringType);

      const choice2 = sut.ChoiceType([
        sut.LambdaType(sut.IntegerType, T),
        sut.BooleanType,
        sut.LambdaType(sut.IntegerType, T),
      ]);
      const result2 = sut.normalizeChoice(choice2) as IChoiceType;
      expect(result2.name).toBe(TypeName.Choice);
      expect(result2.options).toHaveLength(2);
      expect(result2.options).toContainEqual(
        sut.LambdaType(sut.IntegerType, T),
      );
      expect(result2.options).toContainEqual(sut.BooleanType);
    });

    test("should flatten nested choices and deduplicate", () => {
      const nestedChoice1 = sut.ChoiceType([sut.BooleanType, sut.DateType]);
      const nestedChoice2 = sut.ChoiceType([sut.StringType, sut.BooleanType]); // BooleanType is duplicate
      const choice = sut.ChoiceType([
        sut.IntegerType,
        nestedChoice1,
        sut.StringType, // Duplicate with nestedChoice2
        sut.IntegerType, // Duplicate
        nestedChoice2,
      ]);
      const result = sut.normalizeChoice(choice) as IChoiceType;
      expect(result.name).toBe(TypeName.Choice);
      expect(result.options).toHaveLength(4); // Integer, Boolean, Date, String
      expect(result.options).toContainEqual(sut.IntegerType);
      expect(result.options).toContainEqual(sut.BooleanType);
      expect(result.options).toContainEqual(sut.DateType);
      expect(result.options).toContainEqual(sut.StringType);
    });

    test("should return ChoiceType with empty options if input options are empty", () => {
      const choice = sut.ChoiceType([]);
      const result = sut.normalizeChoice(choice) as IChoiceType;
      expect(result.name).toBe(TypeName.Choice);
      expect(result.options).toHaveLength(0);
    });

    test("should not merge subtypes during normalization; distinct types remain distinct", () => {
      const choice = sut.ChoiceType([
        sut.PrimitiveIntegerType,
        sut.IntegerType,
        sut.StringType,
        sut.SingleType(sut.IntegerType),
        sut.SingleType(sut.PrimitiveIntegerType),
      ]);
      const result = sut.normalizeChoice(choice) as IChoiceType;
      expect(result.name).toBe(TypeName.Choice);
      expect(result.options).toHaveLength(5);
      expect(result.options).toContainEqual(sut.PrimitiveIntegerType);
      expect(result.options).toContainEqual(sut.IntegerType);
      expect(result.options).toContainEqual(sut.StringType);
      expect(result.options).toContainEqual(sut.SingleType(sut.IntegerType));
      expect(result.options).toContainEqual(
        sut.SingleType(sut.PrimitiveIntegerType),
      );
    });
  });

  describe("promote", () => {
    test.each([
      [sut.IntegerType, sut.DecimalType, sut.DecimalType],
      [sut.DecimalType, sut.IntegerType, sut.DecimalType],
      [sut.IntegerType, sut.QuantityType, sut.QuantityType],
      [sut.QuantityType, sut.IntegerType, sut.QuantityType],
      [sut.DecimalType, sut.QuantityType, sut.QuantityType],
      [sut.QuantityType, sut.DecimalType, sut.QuantityType],
    ])(
      "should promote standard numeric types %o and %o to %o",
      (a, b, expected) => {
        expect(sut.promote(a, b)).toEqual(expected);
      },
    );

    test("should return the type itself if type names are the same", () => {
      expect(sut.promote(sut.IntegerType, sut.IntegerType)).toEqual(
        sut.IntegerType,
      );
      expect(sut.promote(sut.StringType, sut.StringType)).toEqual(
        sut.StringType,
      );
      expect(
        sut.promote(sut.PrimitiveIntegerType, sut.PrimitiveIntegerType),
      ).toEqual(sut.PrimitiveIntegerType);
      expect(
        sut.promote(sut.PrimitiveDecimalType, sut.PrimitiveDecimalType),
      ).toEqual(sut.PrimitiveDecimalType);
    });

    test("should return undefined for non-promotable types", () => {
      expect(sut.promote(sut.StringType, sut.IntegerType)).toBeUndefined();
      expect(sut.promote(sut.BooleanType, sut.DecimalType)).toBeUndefined();
      expect(
        sut.promote(sut.DateType, sut.PrimitiveIntegerType),
      ).toBeUndefined();
      expect(
        sut.promote(sut.PrimitiveStringType, sut.IntegerType),
      ).toBeUndefined();
      expect(
        sut.promote(sut.PrimitiveBooleanType, sut.PrimitiveDecimalType),
      ).toBeUndefined();
    });

    describe("promote with primitives", () => {
      test.each([
        // PrimitiveInteger variants with standard types
        [sut.PrimitiveIntegerType, sut.DecimalType, sut.DecimalType],
        [sut.DecimalType, sut.PrimitiveIntegerType, sut.DecimalType],
        [sut.PrimitivePositiveIntegerType, sut.DecimalType, sut.DecimalType],
        [sut.DecimalType, sut.PrimitivePositiveIntegerType, sut.DecimalType],
        [sut.PrimitiveUnsignedIntegerType, sut.DecimalType, sut.DecimalType],
        [sut.DecimalType, sut.PrimitiveUnsignedIntegerType, sut.DecimalType],

        [sut.PrimitiveIntegerType, sut.QuantityType, sut.QuantityType],
        [sut.QuantityType, sut.PrimitiveIntegerType, sut.QuantityType],
        [sut.PrimitivePositiveIntegerType, sut.QuantityType, sut.QuantityType],
        [sut.QuantityType, sut.PrimitiveUnsignedIntegerType, sut.QuantityType],

        // PrimitiveInteger variants with IntegerType (should become IntegerType)
        [sut.PrimitiveIntegerType, sut.IntegerType, sut.IntegerType],
        [sut.IntegerType, sut.PrimitiveIntegerType, sut.IntegerType],
        [sut.PrimitivePositiveIntegerType, sut.IntegerType, sut.IntegerType],
        [sut.IntegerType, sut.PrimitivePositiveIntegerType, sut.IntegerType],
        [sut.PrimitiveUnsignedIntegerType, sut.IntegerType, sut.IntegerType],
        [sut.IntegerType, sut.PrimitiveUnsignedIntegerType, sut.IntegerType],

        // PrimitiveDecimal with standard types
        [sut.PrimitiveDecimalType, sut.IntegerType, sut.DecimalType],
        [sut.IntegerType, sut.PrimitiveDecimalType, sut.DecimalType],
        [sut.PrimitiveDecimalType, sut.QuantityType, sut.QuantityType],
        [sut.QuantityType, sut.PrimitiveDecimalType, sut.QuantityType],

        // PrimitiveDecimal with DecimalType (should become DecimalType)
        [sut.PrimitiveDecimalType, sut.DecimalType, sut.DecimalType],
        [sut.DecimalType, sut.PrimitiveDecimalType, sut.DecimalType],

        // Numeric Primitives with Numeric Primitives
        [sut.PrimitiveIntegerType, sut.PrimitiveDecimalType, sut.DecimalType],
        [sut.PrimitiveDecimalType, sut.PrimitiveIntegerType, sut.DecimalType],
        [
          sut.PrimitivePositiveIntegerType,
          sut.PrimitiveDecimalType,
          sut.DecimalType,
        ],
        [
          sut.PrimitiveUnsignedIntegerType,
          sut.PrimitiveDecimalType,
          sut.DecimalType,
        ],
      ])("should promote %o and %o to %o", (a, b, expected) => {
        expect(sut.promote(a, b)).toEqual(expected);
      });
    });
  });

  describe("mergeBindings", () => {
    test("should merge non-overlapping bindings", () => {
      const a = { T: sut.IntegerType };
      const b = { U: sut.StringType };
      const expected = { T: sut.IntegerType, U: sut.StringType };
      expect(sut.mergeBindings(a, b)).toEqual(expected);
    });

    test("should merge overlapping bindings with identical types", () => {
      const a = { T: sut.IntegerType, V: sut.BooleanType };
      const b = { U: sut.StringType, T: sut.IntegerType };
      const expected = {
        T: sut.IntegerType,
        V: sut.BooleanType,
        U: sut.StringType,
      };
      expect(sut.mergeBindings(a, b)).toEqual(expected);
    });

    test("should merge overlapping bindings with structurally identical complex types", () => {
      const singleInt = sut.SingleType(sut.IntegerType);
      const choiceTU = sut.ChoiceType([T, U]);
      const a = { X: singleInt, Y: sut.BooleanType };
      const b = { Z: sut.StringType, X: sut.SingleType(sut.IntegerType) };
      const expected = {
        X: singleInt,
        Y: sut.BooleanType,
        Z: sut.StringType,
      };
      expect(sut.mergeBindings(a, b)).toEqual(expected);

      const c = { T: choiceTU };
      const d = { T: sut.ChoiceType([T, U]) }; // structurally identical
      expect(sut.mergeBindings(c, d)).toEqual({ T: choiceTU });
    });

    test("should return undefined for overlapping bindings with different types", () => {
      const a = { T: sut.IntegerType };
      const b = { T: sut.StringType };
      expect(sut.mergeBindings(a, b)).toBeUndefined();
    });

    test("should return undefined for overlapping bindings with different complex types", () => {
      const a = { T: sut.SingleType(sut.IntegerType) };
      const b = { T: sut.SingleType(sut.StringType) };
      expect(sut.mergeBindings(a, b)).toBeUndefined();

      const c = { T: sut.ChoiceType([sut.IntegerType]) };
      const d = { T: sut.ChoiceType([sut.StringType]) };
      expect(sut.mergeBindings(c, d)).toBeUndefined();
    });

    test("should handle one empty binding object", () => {
      const a = { T: sut.IntegerType };
      const b = {};
      expect(sut.mergeBindings(a, b)).toEqual(a);
      expect(sut.mergeBindings(b, a)).toEqual(a);
    });

    test("should handle both empty binding objects", () => {
      expect(sut.mergeBindings({}, {})).toEqual({});
    });
  });

  describe("deepEqual", () => {
    test("should return true for identical primitive types", () => {
      expect(sut.deepEqual(sut.IntegerType, sut.IntegerType)).toBe(true);
      expect(
        sut.deepEqual(sut.PrimitiveStringType, sut.PrimitiveStringType),
      ).toBe(true);
    });

    test("should return false for different primitive types", () => {
      expect(sut.deepEqual(sut.IntegerType, sut.StringType)).toBe(false);
      expect(sut.deepEqual(sut.PrimitiveIntegerType, sut.IntegerType)).toBe(
        false,
      );
    });

    test("should return true for identical Generic types", () => {
      expect(sut.deepEqual(T, sut.Generic("T" as GenericLetter))).toBe(true);
    });

    test("should return false for different Generic types", () => {
      expect(sut.deepEqual(T, U)).toBe(false);
    });

    test("should return true for identical complex types (Single, TypeType)", () => {
      expect(
        sut.deepEqual(
          sut.SingleType(sut.IntegerType),
          sut.SingleType(sut.IntegerType),
        ),
      ).toBe(true);
      expect(
        sut.deepEqual(
          sut.TypeType(sut.StringType),
          sut.TypeType(sut.StringType),
        ),
      ).toBe(true);
    });

    test("should return false for TypeType vs SingleType even with same inner type", () => {
      expect(
        sut.deepEqual(
          sut.TypeType(sut.IntegerType),
          sut.SingleType(sut.IntegerType),
        ),
      ).toBe(false);
    });

    test("should return false for different complex types (Single, TypeType)", () => {
      expect(
        sut.deepEqual(
          sut.SingleType(sut.IntegerType),
          sut.SingleType(sut.StringType),
        ),
      ).toBe(false);
      expect(
        sut.deepEqual(sut.SingleType(sut.IntegerType), sut.IntegerType),
      ).toBe(false);
      expect(
        sut.deepEqual(
          sut.TypeType(sut.IntegerType),
          sut.TypeType(sut.StringType),
        ),
      ).toBe(false);
    });

    test("should return true for identical complex types (Lambda)", () => {
      expect(
        sut.deepEqual(
          sut.LambdaType(sut.IntegerType, sut.StringType),
          sut.LambdaType(sut.IntegerType, sut.StringType),
        ),
      ).toBe(true);
      expect(
        sut.deepEqual(
          sut.LambdaType(T, sut.SingleType(U)),
          sut.LambdaType(T, sut.SingleType(U)),
        ),
      ).toBe(true);
    });

    test("should return false for different complex types (Lambda)", () => {
      expect(
        sut.deepEqual(
          sut.LambdaType(sut.StringType, sut.StringType),
          sut.LambdaType(sut.IntegerType, sut.StringType),
        ),
      ).toBe(false); // Diff return
      expect(
        sut.deepEqual(
          sut.LambdaType(sut.IntegerType, sut.BooleanType),
          sut.LambdaType(sut.IntegerType, sut.StringType),
        ),
      ).toBe(false); // Diff context
    });

    test("should return true for identical complex types (Complex)", () => {
      expect(
        sut.deepEqual(
          sut.ComplexType(["Patient", "name"]),
          sut.ComplexType(["Patient", "name"]),
        ),
      ).toBe(true);
    });

    test("should return false for different complex types (Complex)", () => {
      expect(
        sut.deepEqual(
          sut.ComplexType(["Patient", "name"]),
          sut.ComplexType(["Patient", "id"]),
        ),
      ).toBe(false);
      expect(
        sut.deepEqual(
          sut.ComplexType(["Patient", "name"]),
          sut.ComplexType(["Observation", "name"]),
        ),
      ).toBe(false);
      expect(
        sut.deepEqual(
          sut.ComplexType(["Patient", "name"]),
          sut.ComplexType(["Patient"]),
        ),
      ).toBe(false);
    });

    test("should return true for identical Choice types (order-insensitive)", () => {
      const choice1 = sut.ChoiceType([
        sut.IntegerType,
        sut.StringType,
        sut.SingleType(T),
      ]);
      const choice2 = sut.ChoiceType([
        sut.StringType,
        sut.SingleType(T),
        sut.IntegerType,
      ]);
      expect(sut.deepEqual(choice1, choice2)).toBe(true);
    });

    test("should return false for Choice types with different options or counts", () => {
      const choice1 = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      const choice2 = sut.ChoiceType([sut.IntegerType, sut.BooleanType]);
      const choice3 = sut.ChoiceType([
        sut.IntegerType,
        sut.StringType,
        sut.BooleanType,
      ]);
      expect(sut.deepEqual(choice1, choice2)).toBe(false);
      expect(sut.deepEqual(choice1, choice3)).toBe(false);
    });

    test("should return true for empty Choice types", () => {
      expect(sut.deepEqual(sut.ChoiceType([]), sut.ChoiceType([]))).toBe(true);
    });

    test("should return true for identical Invalid types", () => {
      expect(
        sut.deepEqual(sut.InvalidType("error1"), sut.InvalidType("error1")),
      ).toBe(true);
    });
    test("should return false for different Invalid types", () => {
      expect(
        sut.deepEqual(sut.InvalidType("error1"), sut.InvalidType("error2")),
      ).toBe(false);
    });
  });

  describe("isAssignableTo", () => {
    test("exact match (deepEqual)", () => {
      expect(sut.isAssignableTo(sut.IntegerType, sut.IntegerType)).toBe(true);
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.StringType),
          sut.SingleType(sut.StringType),
        ),
      ).toBe(true);
    });

    test("subtyping (isSubtypeOf)", () => {
      expect(
        sut.isAssignableTo(sut.PrimitiveIntegerType, sut.IntegerType),
      ).toBe(true);
      expect(sut.isAssignableTo(sut.PrimitiveStringType, sut.StringType)).toBe(
        true,
      );
    });

    test("target is UnknownType", () => {
      expect(sut.isAssignableTo(sut.IntegerType, sut.UnknownType)).toBe(false);
      expect(sut.isAssignableTo(sut.SingleType(T), sut.UnknownType)).toBe(
        false,
      );
      expect(
        sut.isAssignableTo(sut.ChoiceType([sut.DateType]), sut.UnknownType),
      ).toBe(false);
    });

    test("source is UnknownType (only assignable to UnknownType)", () => {
      expect(sut.isAssignableTo(sut.UnknownType, sut.UnknownType)).toBe(true);
      expect(sut.isAssignableTo(sut.UnknownType, sut.IntegerType)).toBe(false);
    });

    test("target is ChoiceType", () => {
      const targetChoice = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(sut.isAssignableTo(sut.IntegerType, targetChoice)).toBe(true);
      expect(sut.isAssignableTo(sut.PrimitiveStringType, targetChoice)).toBe(
        true,
      ); // PrimitiveString -> String -> choice
      expect(sut.isAssignableTo(sut.BooleanType, targetChoice)).toBe(false);
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.IntegerType),
          sut.ChoiceType([sut.SingleType(sut.IntegerType), sut.BooleanType]),
        ),
      ).toBe(true);
    });

    test("source is ChoiceType", () => {
      // Current isAssignableTo doesn't have special logic for source being Choice.
      // It relies on deepEqual or isSubtypeOf.
      const sourceChoice = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(sut.isAssignableTo(sourceChoice, sourceChoice)).toBe(true); // deepEqual
      expect(sut.isAssignableTo(sourceChoice, sut.UnknownType)).toBe(false);

      // This would be false as Choice is not a subtype of Integer, nor are they deepEqual
      expect(sut.isAssignableTo(sourceChoice, sut.IntegerType)).toBe(false);

      const choicePrimInt = sut.ChoiceType([sut.PrimitiveIntegerType]);
      const choiceInt = sut.ChoiceType([sut.IntegerType]);
      // This would be false as they are not deepEqual and Choice is not a subtype of Choice in a way that considers options.
      expect(sut.isAssignableTo(choicePrimInt, choiceInt)).toBe(false);
    });

    test("SingleType unwrapping for source", () => {
      expect(
        sut.isAssignableTo(sut.SingleType(sut.IntegerType), sut.IntegerType),
      ).toBe(true);
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.PrimitiveIntegerType),
          sut.IntegerType,
        ),
      ).toBe(true);
      expect(
        sut.isAssignableTo(sut.SingleType(sut.StringType), sut.BooleanType),
      ).toBe(false);

      // Single<T> to Choice that includes T
      const targetChoice = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(
        sut.isAssignableTo(sut.SingleType(sut.IntegerType), targetChoice),
      ).toBe(true);
    });

    test("No assignment from T to Single<T>", () => {
      expect(
        sut.isAssignableTo(sut.IntegerType, sut.SingleType(sut.IntegerType)),
      ).toBe(false);
    });

    test("Single<X> to Single<Y>", () => {
      // Relies on deepEqual for Single types, which means X must be deepEqual to Y.
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.IntegerType),
          sut.SingleType(sut.IntegerType),
        ),
      ).toBe(true);
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.IntegerType),
          sut.SingleType(sut.StringType),
        ),
      ).toBe(false);
      // This is an important distinction: Single<PrimitiveInteger> is NOT assignable to Single<Integer>
      // by the current rules because deepEqual(PrimitiveInteger, Integer) is false.
      // To allow this, isAssignableTo would need specific logic for covariant generics.
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.PrimitiveIntegerType),
          sut.SingleType(sut.IntegerType),
        ),
      ).toBe(false);
    });

    test("Complex scenarios", () => {
      // Primitive assignable to its standard type
      expect(sut.isAssignableTo(sut.PrimitiveCodeType, sut.StringType)).toBe(
        true,
      );
      // Standard type not assignable to its primitive type
      expect(sut.isAssignableTo(sut.StringType, sut.PrimitiveCodeType)).toBe(
        false,
      );

      // Single<Primitive> to Standard type
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.PrimitiveIntegerType),
          sut.IntegerType,
        ),
      ).toBe(true);
      // Single<Primitive> to Choice including Standard type
      expect(
        sut.isAssignableTo(
          sut.SingleType(sut.PrimitiveDateType),
          sut.ChoiceType([sut.DateType, sut.StringType]),
        ),
      ).toBe(true);
    });
  });

  describe("matchTypePattern", () => {
    test("should return empty bindings for identical non-generic types", () => {
      expect(sut.matchTypePattern(sut.IntegerType, sut.IntegerType)).toEqual(
        {},
      );
      expect(
        sut.matchTypePattern(
          sut.SingleType(sut.StringType),
          sut.SingleType(sut.StringType),
        ),
      ).toEqual({});
    });

    test("should return undefined for mismatching non-generic types (name mismatch)", () => {
      expect(
        sut.matchTypePattern(sut.IntegerType, sut.StringType),
      ).toBeUndefined();
      expect(
        sut.matchTypePattern(
          sut.SingleType(sut.IntegerType),
          sut.TypeType(sut.IntegerType), // Single vs Type
        ),
      ).toBeUndefined();
    });

    test("should return undefined for mismatching non-generic types (inner type mismatch)", () => {
      expect(
        sut.matchTypePattern(
          sut.SingleType(sut.IntegerType),
          sut.SingleType(sut.StringType),
        ),
      ).toBeUndefined();
    });

    test("should match subtypes (actual is subtype of pattern)", () => {
      expect(
        sut.matchTypePattern(sut.IntegerType, sut.PrimitiveIntegerType),
      ).toEqual({});
      expect(
        sut.matchTypePattern(sut.StringType, sut.PrimitiveCodeType),
      ).toEqual({});
    });

    test("should not match supertypes (actual is supertype of pattern)", () => {
      expect(
        sut.matchTypePattern(sut.PrimitiveIntegerType, sut.IntegerType),
      ).toBeUndefined();
      expect(
        sut.matchTypePattern(sut.PrimitiveCodeType, sut.StringType),
      ).toBeUndefined();
    });

    test("should bind generic type T to actual type", () => {
      expect(sut.matchTypePattern(T, sut.IntegerType)).toEqual({
        T: sut.IntegerType,
      });
      expect(sut.matchTypePattern(T, sut.PrimitiveBooleanType)).toEqual({
        T: sut.PrimitiveBooleanType,
      });
      expect(
        sut.matchTypePattern(T, sut.ChoiceType([sut.IntegerType, U])),
      ).toEqual({
        T: sut.ChoiceType([sut.IntegerType, U]),
      });
    });

    test("should match complex pattern", () => {
      const pattern = sut.SingleType(
        sut.ChoiceType([sut.StringType, sut.BooleanType]),
      );
      const actual = sut.SingleType(
        sut.ChoiceType([sut.StringType, sut.BooleanType]),
      );
      expect(sut.matchTypePattern(pattern, actual)).toEqual({});
    });

    test("should match complex pattern with generic", () => {
      const pattern = sut.SingleType(T);
      const actual = sut.SingleType(sut.DecimalType);
      expect(sut.matchTypePattern(pattern, actual)).toEqual({
        T: sut.DecimalType,
      });
    });

    test("should match complex pattern with multiple generics", () => {
      const pattern = sut.LambdaType(T, U);
      const actual = sut.LambdaType(sut.BooleanType, sut.DateType);
      expect(sut.matchTypePattern(pattern, actual)).toEqual({
        T: sut.BooleanType,
        U: sut.DateType,
      });
    });

    test("should return existing bindings if consistent", () => {
      const pattern = sut.SingleType(T);
      const actual = sut.SingleType(sut.DecimalType);
      const bindings = { T: sut.DecimalType, U: sut.StringType };
      expect(sut.matchTypePattern(pattern, actual, bindings)).toEqual({
        T: sut.DecimalType,
        U: sut.StringType,
      });
    });

    test("should return undefined if binding is inconsistent", () => {
      const pattern = sut.SingleType(T);
      const actual = sut.SingleType(sut.DecimalType);
      const bindings = { T: sut.IntegerType }; // Inconsistent
      expect(sut.matchTypePattern(pattern, actual, bindings)).toBeUndefined();
    });

    test("should handle inconsistent bindings in nested structures", () => {
      const pattern = sut.LambdaType(T, T); // Return and context must be same
      const actual = sut.LambdaType(sut.IntegerType, sut.StringType);
      expect(sut.matchTypePattern(pattern, actual)).toBeUndefined(); // T would need to be Integer and String

      const pattern2 = sut.ChoiceType([
        sut.SingleType(T),
        sut.LambdaType(T, U),
      ]);
      const actual2 = sut.SingleType(sut.IntegerType);
      // If T is bound to StringType from a prior step, this will fail
      expect(
        sut.matchTypePattern(pattern2, actual2, { T: sut.StringType }),
      ).toBeUndefined();
    });

    test("should handle consistent bindings in nested structures", () => {
      const pattern = sut.LambdaType(T, T); // Return and context must be same
      const actual = sut.LambdaType(sut.IntegerType, sut.IntegerType);
      expect(sut.matchTypePattern(pattern, actual)).toEqual({
        T: sut.IntegerType,
      });
    });

    test("should match choice pattern if actual matches one option", () => {
      const pattern = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(sut.matchTypePattern(pattern, sut.IntegerType)).toEqual({});
      expect(sut.matchTypePattern(pattern, sut.StringType)).toEqual({});
      // With subtype
      expect(sut.matchTypePattern(pattern, sut.PrimitiveStringType)).toEqual(
        {},
      );
    });

    test("should return undefined if actual matches no choice option", () => {
      const pattern = sut.ChoiceType([sut.IntegerType, sut.StringType]);
      expect(sut.matchTypePattern(pattern, sut.BooleanType)).toBeUndefined();
    });

    test("should prioritize first matching choice option for bindings", () => {
      // If T could be bound differently by two options, the first one that matches 'actual' wins.
      const pattern = sut.ChoiceType([sut.SingleType(T), T]); // Single<T> or T
      // Matches T directly
      expect(sut.matchTypePattern(pattern, sut.StringType)).toEqual({
        T: sut.StringType,
      });

      const actualSingleString = sut.SingleType(sut.StringType); // Matches Single<T> first
      expect(sut.matchTypePattern(pattern, actualSingleString)).toEqual({
        T: sut.StringType,
      });
    });

    test("should match pattern when actual is Single but pattern is not (promotion-like)", () => {
      const pattern = sut.IntegerType;
      const actual = sut.SingleType(sut.IntegerType);
      expect(sut.matchTypePattern(pattern, actual)).toEqual({});

      const pattern2 = sut.IntegerType;
      const actual2 = sut.SingleType(sut.PrimitiveIntegerType); // Single<PrimitiveInteger> vs Integer
      expect(sut.matchTypePattern(pattern2, actual2)).toEqual({}); // PrimitiveInteger is subtype of Integer
    });

    test("should not match if actual is Single and pattern is not, but inner types mismatch", () => {
      const pattern = sut.StringType;
      const actual = sut.SingleType(sut.IntegerType);
      expect(sut.matchTypePattern(pattern, actual)).toBeUndefined();
    });

    test("should match Single(T) vs Single(Integer) when T already bound to Single(Integer) (special case check)", () => {
      // This tests the specific check `parentOfPattern?.name === TypeName.Single && bindings[name].name === TypeName.Single` in matchTypePattern
      const pattern = sut.SingleType(T);
      const actual = sut.SingleType(sut.IntegerType);
      const bindings = { T: sut.IntegerType };
      expect(sut.matchTypePattern(pattern, actual, bindings)).toEqual({
        T: sut.IntegerType,
      });
    });

    test("should match Single(T) vs Single(Integer) when T already bound to Single(Integer) (special case for T binding)", () => {
      const pattern = sut.SingleType(T); // pattern.ofType is T
      const actual = sut.SingleType(sut.IntegerType); // actual.ofType is IntegerType
      const bindings = { T: sut.SingleType(sut.IntegerType) }; // T is bound to Single<Integer>

      // matchTypePattern for outer Single:
      //   pattern = Single(T), actual = Single(IntegerType)
      //   recursive call for ofType: matchTypePattern(T, IntegerType, bindings, Single(T))
      //     Inside this call:
      //       pattern = T, actual = IntegerType, bindings = {T: Single(IntegerType)}, parentOfPattern = Single(T)
      //       Generic T: existingBinding = bindings.T = Single(IntegerType)
      //       deepEqual(existingBinding, actual) -> deepEqual(Single(IntegerType), IntegerType) -> false
      //       Special condition:
      //         parentOfPattern.name === Single (true)
      //         existingBinding.name === Single (true)
      //         deepEqual(existingBinding.ofType, actual) -> deepEqual(IntegerType, IntegerType) -> true
      //       This special condition makes the binding consistent.
      expect(sut.matchTypePattern(pattern, actual, bindings)).toEqual({
        T: sut.SingleType(sut.IntegerType),
      });
    });

    test("should fail match Single(T) vs Single(String) when T bound to Single(Integer) (special case fail)", () => {
      const pattern = sut.SingleType(T);
      const actual = sut.SingleType(sut.StringType); // actual.ofType is StringType
      const bindings = { T: sut.SingleType(sut.IntegerType) };
      //   recursive call: matchTypePattern(T, StringType, {T: Single(Integer)}, Single(T))
      //     Inside this call:
      //       pattern = T, actual = StringType
      //       existingBinding = Single(IntegerType)
      //       deepEqual(Single(IntegerType), StringType) -> false
      //       Special condition:
      //         deepEqual(existingBinding.ofType, actual) -> deepEqual(IntegerType, StringType) -> false
      //       So special condition is false.
      //       The `if` for inconsistent binding `(!deepEqual && !special_condition_met)` becomes `(true && !false)` -> `true`. So, undefined.
      expect(sut.matchTypePattern(pattern, actual, bindings)).toBeUndefined();
    });

    test("match ComplexType", () => {
      expect(
        sut.matchTypePattern(sut.ComplexType(["P"]), sut.ComplexType(["P"])),
      ).toEqual({});
      expect(
        sut.matchTypePattern(sut.ComplexType(["P"]), sut.ComplexType(["Q"])),
      ).toBeUndefined();
      expect(
        sut.matchTypePattern(
          sut.ComplexType(["P", "f"]),
          sut.ComplexType(["P", "f"]),
        ),
      ).toEqual({});
      expect(
        sut.matchTypePattern(
          sut.ComplexType(["P", "f"]),
          sut.ComplexType(["P", "g"]),
        ),
      ).toBeUndefined();
      expect(
        sut.matchTypePattern(
          sut.ComplexType(["P"]),
          sut.ComplexType(["P", "f"]),
        ),
      ).toBeUndefined(); // Length mismatch
    });

    test("match InvalidType", () => {
      expect(
        sut.matchTypePattern(sut.InvalidType("err"), sut.InvalidType("err")),
      ).toEqual({});
      expect(
        sut.matchTypePattern(sut.InvalidType("err1"), sut.InvalidType("err2")),
      ).toBeUndefined();
    });

    test("pattern is UnknownType", () => {
      expect(sut.matchTypePattern(sut.UnknownType, sut.IntegerType)).toEqual(
        undefined,
      );
      expect(sut.matchTypePattern(sut.UnknownType, sut.UnknownType)).toEqual(
        {},
      );
      expect(sut.matchTypePattern(sut.UnknownType, sut.SingleType(T))).toEqual(
        undefined,
      );
    });

    test("actual is UnknownType", () => {
      expect(sut.matchTypePattern(T, sut.UnknownType)).toEqual({
        T: sut.UnknownType,
      }); // T binds to Unknown
    });

    test("undefined pattern or actual", () => {
      expect(sut.matchTypePattern(undefined, sut.IntegerType)).toBeUndefined();
      expect(sut.matchTypePattern(sut.IntegerType, undefined)).toBeUndefined();
      expect(sut.matchTypePattern(undefined, undefined)).toBeUndefined();
    });
  });

  describe("substituteBindings", () => {
    test("should substitute a generic type", () => {
      const type = T;
      const bindings = { T: sut.IntegerType };
      expect(sut.substituteBindings(type, bindings)).toEqual(sut.IntegerType);
    });

    test("should return generic if no binding exists", () => {
      const type = T;
      const bindings = { U: sut.StringType };
      expect(sut.substituteBindings(type, bindings)).toEqual(T);
    });

    test("should substitute generic within SingleType", () => {
      const type = sut.SingleType(T);
      const bindings = { T: sut.BooleanType };
      expect(sut.substituteBindings(type, bindings)).toEqual(
        sut.SingleType(sut.BooleanType),
      );
    });

    test("should substitute generic within TypeType", () => {
      const type = sut.TypeType(T);
      const bindings = { T: sut.BooleanType };
      expect(sut.substituteBindings(type, bindings)).toEqual(
        sut.TypeType(sut.BooleanType),
      );
    });

    test("should substitute generics within ChoiceType (order of options preserved)", () => {
      const type = sut.ChoiceType([T, sut.StringType, U, T]);
      const bindings = { T: sut.IntegerType, U: sut.DateType };
      const result = sut.substituteBindings(type, bindings) as IChoiceType;
      expect(result.name).toBe(TypeName.Choice);
      expect(result.options).toEqual([
        sut.IntegerType,
        sut.StringType,
        sut.DateType,
        sut.IntegerType,
      ]);
    });

    test("should substitute generics within LambdaType", () => {
      const type = sut.LambdaType(T, U);
      const bindings = { T: sut.DecimalType, U: sut.PrimitiveCodeType };
      const expected = sut.LambdaType(sut.DecimalType, sut.PrimitiveCodeType);
      expect(sut.substituteBindings(type, bindings)).toEqual(expected);
    });

    test("should substitute nested generics", () => {
      const type = sut.SingleType(sut.ChoiceType([T, sut.LambdaType(U, V)]));
      const bindings = {
        T: sut.IntegerType,
        U: sut.BooleanType,
        V: sut.StringType,
      };
      const result = sut.substituteBindings(type, bindings) as ISingleType;
      const innerChoice = result.ofType as IChoiceType;

      expect(result.name).toBe(TypeName.Single);
      expect(innerChoice.name).toBe(TypeName.Choice);
      expect(innerChoice.options).toHaveLength(2);

      const expectedInnerLambda = sut.LambdaType(
        sut.BooleanType,
        sut.StringType,
      );
      expect(innerChoice.options).toContainEqual(sut.IntegerType);
      expect(innerChoice.options).toContainEqual(expectedInnerLambda);
    });

    test("should handle bindings that are themselves generic (chain substitution)", () => {
      const type = sut.SingleType(T);
      const bindings = { T: U, U: sut.DecimalType }; // T -> U -> Decimal
      // substituteBindings is not designed for chained resolution within the bindings map itself.
      // It applies bindings once. So T becomes U.
      const expected = sut.SingleType(U);
      expect(sut.substituteBindings(type, bindings)).toEqual(expected);
      // If one wanted T -> Decimal, bindings should be { T: sut.DecimalType, U: sut.DecimalType } or apply substitution iteratively.
    });

    test("should return non-generic types (or generics not in bindings) unchanged", () => {
      const type = sut.LambdaType(sut.IntegerType, sut.StringType);
      const bindings = { T: sut.BooleanType };
      expect(sut.substituteBindings(type, bindings)).toEqual(type);

      const typeWithUnboundGeneric = sut.ChoiceType([sut.IntegerType, V]);
      expect(sut.substituteBindings(typeWithUnboundGeneric, bindings)).toEqual(
        typeWithUnboundGeneric,
      );
    });

    test("should substitute into ComplexType or InvalidType (no-op as they don't contain other types)", () => {
      const complex = sut.ComplexType(["Patient"]);
      expect(sut.substituteBindings(complex, { T: sut.IntegerType })).toEqual(
        complex,
      );
      const invalid = sut.InvalidType("Error");
      expect(sut.substituteBindings(invalid, { T: sut.IntegerType })).toEqual(
        invalid,
      );
    });
  });

  describe("stringifyType", () => {
    // prettier-ignore
    test.each([
      [sut.IntegerType, "Integer"],
      [sut.DecimalType, "Decimal"],
      [sut.StringType, "String"],
      [sut.BooleanType, "Boolean"],
      [sut.DateType, "Date"],
      [sut.DateTimeType, "DateTime"],
      [sut.TimeType, "Time"],
      [sut.QuantityType, "Quantity"],
      [sut.NullType, "Null"],
      [sut.UnknownType, "Unknown"],
      [sut.PrimitiveStringType, "Primitive<string>"],
      [sut.PrimitiveIntegerType, "Primitive<integer>"],
      [sut.PrimitiveCodeType, "Primitive<code>"],
      [sut.PrimitiveDateType, "Primitive<date>"],
      [sut.PrimitiveDateTimeType, "Primitive<dateTime>"],
      [sut.PrimitiveTimeType, "Primitive<time>"],
      [sut.PrimitiveBooleanType, "Primitive<boolean>"],
      [sut.PrimitiveDecimalType, "Primitive<decimal>"],
      [sut.PrimitiveUriType, "Primitive<uri>"],
      [sut.PrimitiveUrlType, "Primitive<url>"],
      [sut.PrimitiveCanonicalType, "Primitive<canonical>"],
      [sut.PrimitiveOidType, "Primitive<oid>"],
      [sut.PrimitiveIdType, "Primitive<id>"],
      [sut.PrimitiveMarkdownType, "Primitive<markdown>"],
      [sut.PrimitivePositiveIntegerType, "Primitive<positiveInteger>"],
      [sut.PrimitiveUnsignedIntegerType, "Primitive<unsignedInteger>"],
      [sut.PrimitiveInstantType, "Primitive<instant>"],
      [sut.PrimitiveUuidType, "Primitive<uuid>"],
      [sut.PrimitiveXhtmlType, "Primitive<xhtml>"],
      [sut.PrimitiveBase64BinaryType, "Primitive<base64Binary>"],
      [sut.Generic("T" as GenericLetter), "T"],
      [sut.SingleType(sut.IntegerType), "Single<Integer>"],
      [sut.TypeType(sut.BooleanType), "Type<Boolean>"], // Assuming TypeType stringifies like Single
      [sut.ChoiceType([sut.IntegerType, sut.StringType]), "Integer | String"],
      [sut.ChoiceType([sut.PrimitiveCodeType, sut.BooleanType]), "Primitive<code> | Boolean"],
      [sut.ChoiceType([sut.IntegerType, sut.ChoiceType([sut.StringType, sut.DateType])]), "Integer | String | Date"], // Flattened by stringify's map
      [sut.ChoiceType([]), ""], // Empty choice
      [sut.LambdaType(sut.BooleanType, sut.StringType), "Lambda<String => Boolean>"],
      [sut.InvalidType("Some error"), "Invalid (Some error)"],
      [sut.InvalidType(""), "Invalid"],
      [sut.ComplexType(["Patient"]), "Patient"],
      [sut.ComplexType(["Patient", "name", "given"]), `Patient["name"]["given"]`],
      [sut.SingleType(sut.ChoiceType([sut.IntegerType, sut.PrimitiveStringType])), "Single<Integer | Primitive<string>>"],
      [sut.LambdaType(T, sut.ChoiceType([U, sut.BooleanType])), "Lambda<U | Boolean => T>"],
      [sut.SingleType(sut.LambdaType(T, U)), "Single<Lambda<U => T>>"],
      [sut.TypeType(sut.ChoiceType([sut.DateType, sut.TimeType])), "Type<Date | Time>"],
    ])("should stringify %o correctly as %s", (type, expectedString) => {
      expect(sut.stringifyType(type)).toBe(expectedString);
    });

    test("stringify choice with single element", () => {
      expect(sut.stringifyType(sut.ChoiceType([sut.IntegerType]))).toBe(
        "Integer",
      );
    });
  });
});
