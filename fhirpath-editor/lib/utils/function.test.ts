import { describe, expect, test } from "vitest";
import * as sut from "./function";
import {
  BooleanType,
  ChoiceType,
  ComplexType,
  DateType,
  DecimalType,
  deepEqual,
  IntegerType,
  InvalidType,
  LambdaType,
  PrimitiveIntegerType,
  PrimitiveStringType,
  QuantityType,
  SingleType,
  stringifyType,
  StringType,
  TypeType,
  UnknownType,
} from "./type";
import {
  FunctionName,
  IChoiceType,
  IComplexType,
  IInvalidType,
  ISingleType,
  Type,
  TypeName,
} from "../types/internal"; // Assuming types are in internal

// --- Helper Types ---
const PatientType: IComplexType = ComplexType(["Patient"]);
const HumanNameType: IComplexType = ComplexType(["HumanName"]);
const AddressType: IComplexType = ComplexType(["Address"]);
const ObservationType: IComplexType = ComplexType(["Observation"]);
const EncounterType: IComplexType = ComplexType(["Encounter"]);

const ResourceType: IChoiceType = ChoiceType([
  PatientType,
  ObservationType,
  EncounterType,
]);

// This mock will be configured per test case
type GetArgumentTypeMock = (
  index: number,
  contextType: Type,
) => Type | undefined;
let currentGetArgumentTypeMock: GetArgumentTypeMock = () => undefined;

const mockGetArgumentType: GetArgumentTypeMock = (index, contextType) => {
  return currentGetArgumentTypeMock(index, contextType);
};

describe("functions", () => {
  describe("resolveFunctionCall", () => {
    test("should return InvalidType if function name is unknown", () => {
      const result = sut.resolveFunctionCall(
        "nonExistentFunction" as FunctionName,
        IntegerType,
        IntegerType,
        mockGetArgumentType,
      );
      expect(result.name).toBe(TypeName.Invalid);
      expect((result as IInvalidType).error).toContain("Unknown function");
    });

    test("should return InvalidType if input type mismatches function definition", () => {
      // String.length() called on an Integer
      const result = sut.resolveFunctionCall(
        "length",
        IntegerType, // Actual input
        IntegerType,
        mockGetArgumentType,
      );
      expect(result.name).toBe(TypeName.Invalid);
      expect((result as IInvalidType).error).toContain(
        "Input type mismatch for length",
      );
      expect((result as IInvalidType).error).toContain(
        `Expected ${stringifyType(StringType)}`,
      );
      expect((result as IInvalidType).error).toContain(
        `got ${stringifyType(IntegerType)}`,
      );
    });

    test("should resolve simple function with no args: today()", () => {
      currentGetArgumentTypeMock = () => undefined; // No args
      const result = sut.resolveFunctionCall(
        "today",
        PatientType, // Input can be anything (Generic T)
        PatientType, // Outer context
        mockGetArgumentType,
      );
      expect(result).toEqual(DateType);
    });

    test("should resolve string function: 'abc'.length()", () => {
      currentGetArgumentTypeMock = () => undefined;
      const result = sut.resolveFunctionCall(
        "length",
        StringType,
        StringType,
        mockGetArgumentType,
      );
      expect(result).toEqual(IntegerType);
    });

    test("should return InvalidType for missing required argument: substring(startIndex)", () => {
      currentGetArgumentTypeMock = (index) => {
        if (index === 0) return IntegerType; // startIndex provided
        return undefined; // length (optional) not provided, but substring() is also defined with required length in spec, this tests the 2-arg version
      };
      // The 'substring' in functionMetadata has length as optional.
      // Let's test a function where an arg is truly required.
      // 'indexOf' has a required 'substring' arg.
      currentGetArgumentTypeMock = () => undefined; // No args provided
      const result = sut.resolveFunctionCall(
        "indexOf",
        StringType,
        StringType,
        mockGetArgumentType,
      );
      expect(result.name).toBe(TypeName.Invalid);
      expect((result as IInvalidType).error).toContain(
        `Missing required argument "substring"`,
      );
    });

    test("should handle optional argument provided: round(decimal, precision)", () => {
      currentGetArgumentTypeMock = (index) => {
        if (index === 0) return IntegerType; // precision
        return undefined;
      };
      const result = sut.resolveFunctionCall(
        "round",
        DecimalType,
        DecimalType,
        mockGetArgumentType,
      );
      expect(result).toEqual(DecimalType); // Precision arg is valid
    });

    test("should handle optional argument NOT provided: round(decimal)", () => {
      currentGetArgumentTypeMock = () => undefined; // No precision
      const result = sut.resolveFunctionCall(
        "round",
        DecimalType,
        DecimalType,
        mockGetArgumentType,
      );
      expect(result).toEqual(DecimalType);
    });

    test("should return InvalidType for argument type mismatch: 'str'.indexOf(123)", () => {
      currentGetArgumentTypeMock = (index) => {
        if (index === 0) return IntegerType; // Arg is number, expected string
        return undefined;
      };
      const result = sut.resolveFunctionCall(
        "indexOf",
        StringType,
        StringType,
        mockGetArgumentType,
      );
      expect(result.name).toBe(TypeName.Invalid);
      expect((result as IInvalidType).error).toContain(
        `Argument type mismatch for "substring"`,
      );
      expect((result as IInvalidType).error).toContain(
        `Expected compatible with ${stringifyType(StringType)}`,
      );
      expect((result as IInvalidType).error).toContain(
        `got ${stringifyType(IntegerType)}`,
      );
    });

    describe("Generic Type Binding and Lambdas", () => {
      test("Patient.empty() : T binds to PatientType", () => {
        currentGetArgumentTypeMock = () => undefined;
        const result = sut.resolveFunctionCall(
          "empty",
          PatientType,
          PatientType,
          mockGetArgumentType,
        );
        expect(result).toEqual(BooleanType);
      });

      test("Patient.name.distinct() : T binds to HumanNameType", () => {
        currentGetArgumentTypeMock = () => undefined;
        // Assuming Patient.name is HumanNameType[]
        const result = sut.resolveFunctionCall(
          "distinct",
          HumanNameType, // If Patient.name evaluates to HumanNameType[]
          PatientType,
          mockGetArgumentType,
        );
        expect(result).toEqual(HumanNameType); // Returns T
      });

      test("Patient.where($this.active): Lambda with T context", () => {
        // Patient.where(criteria: ($this as Patient) => $this.active)
        // meta.input = Generic("T") -> PatientType
        // meta.args[0].type = LambdaType(BooleanType, SingleType(Generic("T")))
        // substituted argDef.type = LambdaType(BooleanType, SingleType(PatientType))

        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            // This is the lambda body ($this.active)
            // Check contextType for lambda body
            expect(deepEqual(contextType, SingleType(PatientType))).toBe(true);
            return BooleanType; // $this.active evaluates to Boolean
          }
          return undefined;
        };

        const result = sut.resolveFunctionCall(
          "where",
          PatientType, // Input to where is Patient[] (represented as PatientType for collection T)
          ResourceType, // Outer context doesn't matter as much here
          mockGetArgumentType,
        );
        // where returns T, which is PatientType
        expect(result).toEqual(PatientType);
      });

      test("Patient.select($this.name): Lambda with T context, binds R", () => {
        // Patient.select(projection: ($this as Patient) => $this.name)
        // meta.input = Generic("T") -> PatientType
        // meta.args[0].type = LambdaType(Generic("R"), SingleType(Generic("T")))
        // substituted argDef.type = LambdaType(Generic("R"), SingleType(PatientType))

        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            // Lambda body ($this.name)
            expect(deepEqual(contextType, SingleType(PatientType))).toBe(true);
            return HumanNameType; // $this.name evaluates to HumanNameType
          }
          return undefined;
        };

        const result = sut.resolveFunctionCall(
          "select",
          PatientType, // Input Patient[]
          ResourceType,
          mockGetArgumentType,
        );
        // select returns R, which is bound to HumanNameType by the lambda
        expect(result).toEqual(HumanNameType);
      });

      test("Patient.name.select($this.given): Nested generic context", () => {
        // Patient.name is HumanNameType[]
        // select input T is HumanNameType
        // lambda context is SingleType(HumanNameType)
        // lambda body $this.given is StringType[]
        // R binds to StringType[]
        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            expect(deepEqual(contextType, SingleType(HumanNameType))).toBe(
              true,
            );
            return StringType; // $this.given
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "select",
          HumanNameType, // Input is HumanNameType[]
          PatientType, // Outer context
          mockGetArgumentType,
        );
        expect(result).toEqual(StringType);
      });

      test("InvalidType if lambda body type mismatches expected lambda return: Patient.where($this.name)", () => {
        // Expected: LambdaType(BooleanType, SingleType(PatientType))
        // Actual:   LambdaType(HumanNameType, SingleType(PatientType)) (from $this.name)
        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            expect(deepEqual(contextType, SingleType(PatientType))).toBe(true);
            return HumanNameType; // $this.name, but 'where' expects boolean
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "where",
          PatientType,
          ResourceType,
          mockGetArgumentType,
        );
        expect(result.name).toBe(TypeName.Invalid);
        expect((result as IInvalidType).error).toContain(
          `Argument type mismatch for "criteria"`,
        );
        const expectedLambdaStr = stringifyType(
          LambdaType(BooleanType, SingleType(PatientType)),
        );
        const actualLambdaStr = stringifyType(
          LambdaType(HumanNameType, SingleType(PatientType)),
        );
        expect((result as IInvalidType).error).toContain(expectedLambdaStr);
        expect((result as IInvalidType).error).toContain(actualLambdaStr);
      });

      test("Propagate InvalidType from argument expression: Patient.where($this.nonExistent)", () => {
        currentGetArgumentTypeMock = (index) => {
          if (index === 0) {
            return InvalidType("Field nonExistent not found");
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "where",
          PatientType,
          ResourceType,
          mockGetArgumentType,
        );
        expect(result.name).toBe(TypeName.Invalid);
        expect((result as IInvalidType).error).toBe(
          "Field nonExistent not found",
        );
      });
    });

    describe("ofType function", () => {
      test("Resource.ofType(Patient)", () => {
        // meta.input = Generic("T") -> ResourceType
        // meta.args[0].type = TypeType(Generic("X"))
        // For ofType, the argument expression (e.g., "Patient") resolves to the Type itself.
        // We model this by having getArgumentType return a TypeType.
        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            // The argument 'Patient' (a type specifier)
            expect(deepEqual(contextType, ResourceType)).toBe(true); // Context for arg expr is outer context
            return TypeType(PatientType); // Arg expression evaluates to Type<Patient>
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "ofType",
          ResourceType, // Input is a collection of various resources
          ResourceType, // Outer context
          mockGetArgumentType,
        );
        // ofType returns X (which is PatientType), potentially normalized Choice
        expect(deepEqual(result, PatientType)).toBe(true);
      });

      test("Patient.ofType(HumanName) : T=Patient, X=HumanName", () => {
        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            expect(deepEqual(contextType, PatientType)).toBe(true);
            return TypeType(HumanNameType);
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "ofType",
          PatientType, // Input collection is Patient[]
          PatientType,
          mockGetArgumentType,
        );
        expect(deepEqual(result, HumanNameType)).toBe(true);
      });

      test("Resource.ofType(String) : T=Resource, X=String", () => {
        currentGetArgumentTypeMock = (index, contextType) => {
          if (index === 0) {
            expect(deepEqual(contextType, ResourceType)).toBe(true);
            return TypeType(PrimitiveStringType);
          }
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "ofType",
          ResourceType,
          ResourceType,
          mockGetArgumentType,
        );
        expect(deepEqual(result, PrimitiveStringType)).toBe(true);
      });
    });

    describe("iif function", () => {
      // iif(condition C, then T, else F) -> Choice<T,F> or T
      test("iif($this.active, $this.name, $this.address) on Patient", () => {
        // Input I = PatientType
        // Arg0: cond C lambda: ($this as Patient) => $this.active (Boolean)
        // Arg1: then T lambda: ($this as Patient) => $this.name (HumanName)
        // Arg2: else F lambda: ($this as Patient) => $this.address (Address)
        currentGetArgumentTypeMock = (index, contextType) => {
          // Context for all lambdas is SingleType(PatientType)
          expect(deepEqual(contextType, SingleType(PatientType))).toBe(true);
          if (index === 0) return BooleanType; // condition
          if (index === 1) return HumanNameType; // then branch
          if (index === 2) return AddressType; // else branch
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "iif",
          PatientType, // Input can be Generic("I")
          PatientType, // Outer context
          mockGetArgumentType,
        );
        // Returns ChoiceType([HumanNameType, AddressType])
        expect(result.name).toBe(TypeName.Choice);
        const choiceResult = result as IChoiceType;
        expect(choiceResult.options).toHaveLength(2);
        expect(
          choiceResult.options.some((opt) => deepEqual(opt, HumanNameType)),
        ).toBe(true);
        expect(
          choiceResult.options.some((opt) => deepEqual(opt, AddressType)),
        ).toBe(true);
      });

      test("iif($this.active, $this.name) on Patient (no else)", () => {
        currentGetArgumentTypeMock = (index, contextType) => {
          expect(deepEqual(contextType, SingleType(PatientType))).toBe(true);
          if (index === 0) return BooleanType;
          if (index === 1) return HumanNameType;
          // Arg 2 (else) is optional and not provided. `getArgumentType` will return undefined.
          // `resolveFunctionCall` will then treat it as NullType for matching.
          return undefined;
        };
        const result = sut.resolveFunctionCall(
          "iif",
          PatientType,
          PatientType,
          mockGetArgumentType,
        );
        // Returns T (HumanNameType) because else is NullType (effectively)
        expect(result).toEqual(HumanNameType);
      });

      test("iif(true, 1, 'string') where input is non-collection", () => {
        // This tests iif not on a collection context, but with direct values for lambdas.
        // Let's assume the input type is a single Boolean for simplicity of $this,
        // though iif's input is Generic("I").
        const inputForIif = BooleanType; // $this for lambdas will be Single<BooleanType>
        currentGetArgumentTypeMock = (index, contextType) => {
          expect(deepEqual(contextType, SingleType(inputForIif))).toBe(true);
          if (index === 0) return BooleanType; // condition lambda returns boolean
          if (index === 1) return IntegerType; // then lambda returns integer
          if (index === 2) return StringType; // else lambda returns string
          return undefined;
        };

        const result = sut.resolveFunctionCall(
          "iif",
          inputForIif,
          UnknownType, // outer context
          mockGetArgumentType,
        );
        expect(result.name).toBe(TypeName.Choice);
        const choiceResult = result as IChoiceType;
        expect(choiceResult.options).toHaveLength(2);
        expect(
          choiceResult.options.some((opt) => deepEqual(opt, IntegerType)),
        ).toBe(true);
        expect(
          choiceResult.options.some((opt) => deepEqual(opt, StringType)),
        ).toBe(true);
      });
    });

    describe("Aggregate functions (sum, min, max, avg)", () => {
      test.each(["sum", "min", "max", "avg"] as FunctionName[])(
        "%s({1, 2.0, 3qty})",
        (funcName) => {
          // Input is ChoiceType([IntegerType, DecimalType, QuantityType])
          const inputAggType = ChoiceType([
            IntegerType,
            DecimalType,
            QuantityType,
          ]);
          currentGetArgumentTypeMock = () => undefined; // No args for these
          const result = sut.resolveFunctionCall(
            funcName,
            inputAggType,
            UnknownType,
            mockGetArgumentType,
          );
          // Returns SingleType(InputType)
          expect(result.name).toBe(TypeName.Single);
          expect(deepEqual((result as ISingleType).ofType, inputAggType)).toBe(
            true,
          );
        },
      );

      test.each(["sum", "min", "max", "avg"] as FunctionName[])(
        "%s(Quantity(1,'mg'))",
        (funcName) => {
          currentGetArgumentTypeMock = () => undefined;
          const result = sut.resolveFunctionCall(
            funcName,
            QuantityType,
            UnknownType,
            mockGetArgumentType,
          );
          expect(result.name).toBe(TypeName.Single);
          expect(deepEqual((result as ISingleType).ofType, QuantityType)).toBe(
            true,
          );
        },
      );
    });
  });

  describe("getArgumentContextType", () => {
    test("should return lambda's defined context for a lambda argument: Patient.where($this.active)", () => {
      // For Patient.where(criteria), criteria is LambdaType(BooleanType, SingleType(Generic("T")))
      // T is bound to PatientType from input. So context for criteria lambda is SingleType(PatientType).
      currentGetArgumentTypeMock = () => undefined;

      const context = sut.getArgumentContextType(
        0, // Index of 'criteria' argument
        "where",
        PatientType, // Input to 'where'
        ResourceType, // Outer context (doesn't affect lambda's $this)
        mockGetArgumentType,
      );
      expect(deepEqual(context, SingleType(PatientType))).toBe(true);
    });

    test("should return outer context for a non-lambda argument: 'str'.substring(startIndex)", () => {
      // startIndex is IntegerType, not a lambda. Its context is the outer context.
      currentGetArgumentTypeMock = () => undefined;
      const outerCtx = ComplexType(["SomeResource"]);
      const context = sut.getArgumentContextType(
        0, // Index of 'startIndex'
        "substring",
        StringType, // Input to 'substring'
        outerCtx, // Outer context
        mockGetArgumentType,
      );
      // For non-lambda args, the context passed to getArgumentType should be the outer context.
      // `getArgumentContextType` is designed to find the context *for evaluating the argument expression itself*.
      // The `capturedContext` variable in `getArgumentContextType` is the `argContextType` passed to the `getArgumentType` callback.
      expect(deepEqual(context, outerCtx)).toBe(true);
    });

    test("should return context for ofType argument: Resource.ofType(Patient)", () => {
      currentGetArgumentTypeMock = () => undefined;
      const context = sut.getArgumentContextType(
        0, // Index of 'type' argument for ofType
        "ofType",
        ResourceType, // Input to ofType
        ResourceType, // Outer context
        mockGetArgumentType,
      );
      // The 'type' argument (e.g., Patient) is not a lambda.
      // Its expression is evaluated in the outer context.
      expect(deepEqual(context, ResourceType)).toBe(true);
    });

    test("should return InvalidType if function or argument index is invalid", () => {
      currentGetArgumentTypeMock = () => undefined;
      let context = sut.getArgumentContextType(
        0,
        "nonExistentFunc" as FunctionName,
        PatientType,
        PatientType,
        mockGetArgumentType,
      );
      expect(context.name).toBe(TypeName.Invalid);

      context = sut.getArgumentContextType(
        5, // Out of bounds for 'where'
        "where",
        PatientType,
        PatientType,
        mockGetArgumentType,
      );
      expect(context.name).toBe(TypeName.Invalid);
      expect((context as IInvalidType).error).toBe(
        "Failed to capture argument context",
      );
    });
  });

  describe("suggestFunctionsForInputType", () => {
    test("should suggest 'length', 'upper' for StringType", () => {
      const suggestions = sut.suggestFunctionsForInputType(StringType);
      const suggestionNames = suggestions.map((s) => s.name);
      expect(suggestionNames).toContain("length");
      expect(suggestionNames).toContain("upper");
      expect(suggestionNames).not.toContain("abs"); // Math function
    });

    test("should suggest 'abs', 'round' for IntegerType (via Choice or Generic)", () => {
      // 'abs' takes ChoiceType([IntegerType, DecimalType, QuantityType])
      // 'round' takes DecimalType. Integer is not subtype of Decimal.
      // Let's check for Integer -> Generic "T" functions
      const suggestions = sut.suggestFunctionsForInputType(IntegerType);
      const suggestionNames = suggestions.map((s) => s.name);

      expect(suggestionNames).toContain("abs"); // Integer is in Choice for abs
      expect(suggestionNames).not.toContain("round"); // Integer not Decimal
      expect(suggestionNames).toContain("toDecimal"); // Conversion
      expect(suggestionNames).toContain("empty"); // Generic T
    });

    test("should suggest 'abs', 'round' for DecimalType", () => {
      const suggestions = sut.suggestFunctionsForInputType(DecimalType);
      const suggestionNames = suggestions.map((s) => s.name);
      expect(suggestionNames).toContain("abs");
      expect(suggestionNames).toContain("round");
      expect(suggestionNames).toContain("toString"); // Generic T
    });

    test("should suggest 'children', 'extension' for ComplexType (PatientType)", () => {
      const suggestions = sut.suggestFunctionsForInputType(PatientType);
      const suggestionNames = suggestions.map((s) => s.name);
      // These take Generic("T")
      expect(suggestionNames).toContain("children");
      expect(suggestionNames).toContain("extension");
      expect(suggestionNames).toContain("exists");
    });

    test("should suggest functions for PrimitiveType (e.g. PrimitiveIntegerType)", () => {
      const suggestions =
        sut.suggestFunctionsForInputType(PrimitiveIntegerType);
      const suggestionNames = suggestions.map((s) => s.name);
      expect(suggestionNames).toContain("abs"); // PrimitiveInteger is subtype of Integer, which is in Choice for abs
      expect(suggestionNames).toContain("empty"); // Generic T
    });

    test("should not suggest 'length' for IntegerType", () => {
      const suggestions = sut.suggestFunctionsForInputType(IntegerType);
      const suggestionNames = suggestions.map((s) => s.name);
      expect(suggestionNames).not.toContain("length");
    });
  });
});
