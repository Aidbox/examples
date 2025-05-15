import {
  type GenericLetter,
  type IBooleanType,
  type IChoiceType,
  type IComplexType,
  type IDateTimeType,
  type IDateType,
  type IDecimalType,
  type IGenericType,
  type IIntegerType,
  type IInvalidType,
  type ILambdaType,
  type INullType,
  type IPrimitiveBase64BinaryType,
  type IPrimitiveBooleanType,
  type IPrimitiveCanonicalType,
  type IPrimitiveCodeType,
  type IPrimitiveDateTimeType,
  type IPrimitiveDateType,
  type IPrimitiveDecimalType,
  type IPrimitiveIdType,
  type IPrimitiveInstantType,
  type IPrimitiveIntegerType,
  type IPrimitiveMarkdownType,
  type IPrimitiveOidType,
  type IPrimitivePositiveIntegerType,
  type IPrimitiveStringType,
  type IPrimitiveTimeType,
  type IPrimitiveUnsignedIntegerType,
  type IPrimitiveUriType,
  type IPrimitiveUrlType,
  type IPrimitiveUuidType,
  type IPrimitiveXhtmlType,
  type IQuantityType,
  type ISingleType,
  type IStringType,
  type ITimeType,
  type ITypeType,
  type IUnknownType,
  type Type,
  TypeName,
} from "../types/internal";
import { assertDefined } from "./misc.ts";

const typeHierarchy: Partial<Record<TypeName, TypeName[]>> = {};

export function extendType<T extends Type>(supertype: Type, subtype: T): T {
  if (
    supertype.name === TypeName.Single ||
    supertype.name === TypeName.Choice ||
    supertype.name === TypeName.Lambda ||
    supertype.name === TypeName.Type ||
    supertype.name === TypeName.Generic ||
    supertype.name === TypeName.Complex ||
    supertype.name === TypeName.Invalid ||
    subtype.name === TypeName.Single ||
    subtype.name === TypeName.Choice ||
    subtype.name === TypeName.Lambda ||
    subtype.name === TypeName.Type ||
    subtype.name === TypeName.Generic ||
    subtype.name === TypeName.Complex ||
    subtype.name === TypeName.Invalid
  ) {
    throw new Error("Parametrized types cannot be extended");
  }

  const currentSupertypes = typeHierarchy[subtype.name] || [];
  typeHierarchy[subtype.name] = Array.from(
    new Set([...currentSupertypes, supertype.name]),
  );

  return subtype;
}

export function isSubtypeOf(actual: Type, expected: Type): boolean {
  const a = actual.name;
  const e = expected.name;

  if (
    a === TypeName.Single ||
    a === TypeName.Choice ||
    a === TypeName.Lambda ||
    a === TypeName.Type ||
    a === TypeName.Generic ||
    a === TypeName.Complex ||
    a === TypeName.Invalid ||
    e === TypeName.Single ||
    e === TypeName.Choice ||
    e === TypeName.Lambda ||
    e === TypeName.Type ||
    e === TypeName.Generic ||
    e === TypeName.Complex ||
    e === TypeName.Invalid
  ) {
    return false;
  }

  if (a === e) return true;

  const seen = new Set<TypeName>();
  const queue: Array<TypeName> = [a];

  while (queue.length > 0) {
    const t = queue.shift()!;
    if (t === e) return true;

    const supers = typeHierarchy[t];
    supers?.forEach((s) => {
      if (!seen.has(s)) {
        queue.push(s);
        seen.add(s);
      }
    });
  }

  return false;
}
export const IntegerType: IIntegerType = { name: TypeName.Integer };

export const DecimalType: IDecimalType = { name: TypeName.Decimal };

export const StringType: IStringType = { name: TypeName.String };

export const BooleanType: IBooleanType = { name: TypeName.Boolean };

export const DateType: IDateType = { name: TypeName.Date };

export const DateTimeType: IDateTimeType = { name: TypeName.DateTime };

export const TimeType: ITimeType = { name: TypeName.Time };

export const QuantityType: IQuantityType = { name: TypeName.Quantity };

export const NullType: INullType = { name: TypeName.Null };

export const UnknownType: IUnknownType = { name: TypeName.Unknown };

export const PrimitiveCodeType: IPrimitiveCodeType = extendType(StringType, {
  name: TypeName.PrimitiveCode,
});

export const PrimitiveBooleanType: IPrimitiveBooleanType = extendType(
  BooleanType,
  {
    name: TypeName.PrimitiveBoolean,
  },
);

export const PrimitiveStringType: IPrimitiveStringType = extendType(
  StringType,
  {
    name: TypeName.PrimitiveString,
  },
);

export const PrimitiveUriType: IPrimitiveUriType = extendType(StringType, {
  name: TypeName.PrimitiveUri,
});

export const PrimitiveDateType: IPrimitiveDateType = extendType(DateType, {
  name: TypeName.PrimitiveDate,
});

export const PrimitiveDateTimeType: IPrimitiveDateTimeType = extendType(
  DateTimeType,
  {
    name: TypeName.PrimitiveDateTime,
  },
);

export const PrimitiveDecimalType: IPrimitiveDecimalType = extendType(
  DecimalType,
  {
    name: TypeName.PrimitiveDecimal,
  },
);

export const PrimitiveMarkdownType: IPrimitiveMarkdownType = extendType(
  StringType,
  {
    name: TypeName.PrimitiveMarkdown,
  },
);

export const PrimitiveCanonicalType: IPrimitiveCanonicalType = extendType(
  StringType,
  {
    name: TypeName.PrimitiveCanonical,
  },
);

export const PrimitiveTimeType: IPrimitiveTimeType = extendType(TimeType, {
  name: TypeName.PrimitiveTime,
});

export const PrimitiveIdType: IPrimitiveIdType = extendType(StringType, {
  name: TypeName.PrimitiveId,
});

export const PrimitiveIntegerType: IPrimitiveIntegerType = extendType(
  IntegerType,
  {
    name: TypeName.PrimitiveInteger,
  },
);

export const PrimitivePositiveIntegerType: IPrimitivePositiveIntegerType =
  extendType(IntegerType, {
    name: TypeName.PrimitivePositiveInteger,
  });

export const PrimitiveUnsignedIntegerType: IPrimitiveUnsignedIntegerType =
  extendType(IntegerType, {
    name: TypeName.PrimitiveUnsignedInteger,
  });

export const PrimitiveInstantType: IPrimitiveInstantType = extendType(
  DateTimeType,
  {
    name: TypeName.PrimitiveInstant,
  },
);

export const PrimitiveUuidType: IPrimitiveUuidType = extendType(StringType, {
  name: TypeName.PrimitiveUuid,
});

export const PrimitiveUrlType: IPrimitiveUrlType = extendType(StringType, {
  name: TypeName.PrimitiveUrl,
});

export const PrimitiveOidType: IPrimitiveOidType = extendType(StringType, {
  name: TypeName.PrimitiveOid,
});

export const PrimitiveXhtmlType: IPrimitiveXhtmlType = extendType(StringType, {
  name: TypeName.PrimitiveXhtml,
});

export const PrimitiveBase64BinaryType: IPrimitiveBase64BinaryType = extendType(
  StringType,
  {
    name: TypeName.PrimitiveBase64Binary,
  },
);

export const ComplexType = (schemaReference: string[]): IComplexType => ({
  name: TypeName.Complex,
  schemaReference,
});

export function InvalidType(error: string, positionOrStart?: number): Type {
  return {
    name: TypeName.Invalid,
    error,
    position:
      typeof positionOrStart === "number"
        ? {
            start: positionOrStart,
            end: positionOrStart,
          }
        : positionOrStart,
  };
}

export const TypeType = (ofType: Type): ITypeType => ({
  name: TypeName.Type,
  ofType,
});

export const SingleType = (ofType: Type): ISingleType => {
  if (ofType.name === TypeName.Single) return ofType;

  return {
    name: TypeName.Single,
    ofType,
  };
};

export const ChoiceType = (options: Type[]): IChoiceType => ({
  name: TypeName.Choice,
  options,
});

export function Generic(letter: GenericLetter): IGenericType {
  return {
    name: TypeName.Generic,
    letter,
  };
}

export const LambdaType = (
  returnType: Type,
  contextType: Type,
): ILambdaType => ({
  name: TypeName.Lambda,
  returnType,
  contextType,
});

export function unwrapSingle(t: Type): Type {
  return t?.name === TypeName.Single ? t.ofType : t;
}

export function normalizeChoice(choice: IChoiceType): Type {
  const allFlattenedOptions: Type[] = [];
  const queue: Type[] = [...choice.options]; // Use a queue of Type for mixed types

  while (queue.length > 0) {
    const opt = queue.shift();
    if (!opt) continue;

    if (opt.name === TypeName.Choice) {
      queue.push(...opt.options);
    } else {
      allFlattenedOptions.push(opt);
    }
  }

  const uniqueOptions: Type[] = [];
  for (const opt of allFlattenedOptions) {
    if (!uniqueOptions.some((uo) => deepEqual(uo, opt))) {
      uniqueOptions.push(opt);
    }
  }

  return uniqueOptions.length === 1 && uniqueOptions[0]
    ? uniqueOptions[0]
    : ChoiceType(uniqueOptions);
}

export function promote(a: Type, b: Type): Type | undefined {
  if (
    a.name === TypeName.Single ||
    a.name === TypeName.Choice ||
    a.name === TypeName.Lambda ||
    a.name === TypeName.Type ||
    a.name === TypeName.Generic ||
    a.name === TypeName.Complex ||
    a.name === TypeName.Invalid ||
    b.name === TypeName.Single ||
    b.name === TypeName.Choice ||
    b.name === TypeName.Lambda ||
    b.name === TypeName.Type ||
    b.name === TypeName.Generic ||
    b.name === TypeName.Complex ||
    b.name === TypeName.Invalid
  ) {
    return undefined;
  }
  if (a.name === b.name) return a;

  const normA = isSubtypeOf(a, IntegerType)
    ? IntegerType
    : isSubtypeOf(a, DecimalType)
      ? DecimalType
      : a;

  const normB = isSubtypeOf(b, IntegerType)
    ? IntegerType
    : isSubtypeOf(b, DecimalType)
      ? DecimalType
      : b;

  if (normA.name === normB.name) return normA;

  const map: Partial<Record<TypeName, Partial<Record<TypeName, Type>>>> = {
    [TypeName.Integer]: {
      [TypeName.Decimal]: DecimalType,
      [TypeName.Quantity]: QuantityType,
    },
    [TypeName.Decimal]: {
      [TypeName.Integer]: DecimalType,
      [TypeName.Quantity]: QuantityType,
    },
    [TypeName.Quantity]: {
      [TypeName.Integer]: QuantityType,
      [TypeName.Decimal]: QuantityType,
    },
  } as const;

  const result = map[normA.name]?.[normB.name] || map[normB.name]?.[normA.name];
  return result || undefined;
}

export function mergeBindings(
  a: Record<string, Type>,
  b: Record<string, Type>,
): Record<string, Type> | undefined {
  const result = { ...a };
  for (const key in b) {
    if (key in result) {
      if (!deepEqual(result[key], b[key])) return undefined;
    } else {
      const binding = b[key];
      assertDefined(binding);
      result[key] = binding;
    }
  }
  return result;
}

export function deepEqual(a: Type, b: Type): boolean {
  if (a === b) return true;
  if (a.name !== b.name) return false;

  switch (a.name) {
    case TypeName.Generic:
      return (a as IGenericType).letter === (b as IGenericType).letter;

    case TypeName.Single:
    case TypeName.Type:
      return deepEqual(
        (a as ISingleType | ITypeType).ofType,
        (b as ISingleType | ITypeType).ofType,
      );

    case TypeName.Choice: {
      const aOptions = (a as IChoiceType).options;
      const bOptions = (b as IChoiceType).options;

      if (aOptions.length !== bOptions.length) return false;
      if (aOptions.length === 0) return true;

      const bOptionsUsed = Array(bOptions.length).fill(false);
      for (const aOpt of aOptions) {
        let foundMatch = false;
        for (let j = 0; j < bOptions.length; j++) {
          if (!bOptionsUsed[j] && deepEqual(aOpt, bOptions[j])) {
            bOptionsUsed[j] = true;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) return false;
      }
      return true;
    }

    case TypeName.Lambda:
      return (
        deepEqual(
          (a as ILambdaType).returnType,
          (b as ILambdaType).returnType,
        ) &&
        deepEqual(
          (a as ILambdaType).contextType,
          (b as ILambdaType).contextType,
        )
      );

    case TypeName.Complex: {
      const aRef = (a as IComplexType).schemaReference;
      const bRef = (b as IComplexType).schemaReference;
      if (aRef.length !== bRef.length) return false;
      for (let i = 0; i < aRef.length; i++) {
        if (aRef[i] !== bRef[i]) return false;
      }
      return true;
    }

    case TypeName.Invalid:
      return (a as IInvalidType).error === (b as IInvalidType).error;

    // Default: Non parametrized type
    default:
      return true;
  }
}

export function isAssignableTo(source: Type, target: Type): boolean {
  if (deepEqual(source, target)) {
    return true;
  }

  if (isSubtypeOf(source, target)) {
    return true;
  }

  if (target.name === TypeName.Choice) {
    return target.options.some((option) => isAssignableTo(source, option));
  }

  if (source.name === TypeName.Single && target.name !== TypeName.Single) {
    return isAssignableTo(source.ofType, target);
  }

  return false;
}

export function matchTypePattern(
  pattern: Type | undefined,
  actual: Type | undefined,
  bindings: Record<string, Type> = {},
  parentOfPattern?: Type, // parentOfPattern helps with the Single<T> vs T binding check
): Record<string, Type> | undefined {
  if (!pattern || !actual) return undefined; // No match if either is undefined

  // --- Helper for permutations, used in Choice-to-Choice matching ---
  // Placed inside or at module level if preferred, and accessible by matchChoiceToChoice
  function* generatePermutations(
    arr: number[],
    l = 0,
    r = arr.length - 1,
  ): Generator<number[]> {
    if (l === r) {
      yield [...arr]; // Yield a copy of the permutation
    } else {
      for (let i = l; i <= r; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]]; // Swap
        yield* generatePermutations(arr, l + 1, r);
        [arr[l], arr[i]] = [arr[i], arr[l]]; // Backtrack (swap back)
      }
    }
  }

  // --- Helper for Choice-to-Choice matching ---
  // This function needs to be defined before its use in step 3 or be accessible in scope.
  function matchChoiceToChoice(
    patternAsChoice: IChoiceType,
    actualAsChoice: IChoiceType,
    currentBindings: Record<string, Type>,
    // parentOfPatternForSubmatch is patternAsChoice itself
  ): Record<string, Type> | undefined {
    const pOptions = patternAsChoice.options;
    const aOptions = actualAsChoice.options;

    if (pOptions.length !== aOptions.length) {
      return undefined;
    }
    if (pOptions.length === 0) {
      // Both choices are empty
      return { ...currentBindings };
    }

    const numOptions = pOptions.length;
    // Create an array of indices [0, 1, ..., numOptions-1] for actual.options
    const actualOptionIndices = Array.from({ length: numOptions }, (_, i) => i);

    // Iterate over all permutations of actual.options to match against pattern.options
    for (const permutedIndices of generatePermutations([
      ...actualOptionIndices,
    ])) {
      // Pass a copy to permute
      let permutationAttemptBindings: Record<string, Type> | undefined = {
        ...currentBindings,
      };
      let possibleThisPermutation = true;

      for (let i = 0; i < numOptions; i++) {
        const pOpt = pOptions[i];
        const aOpt = aOptions[permutedIndices[i]]; // Get permuted actual option

        // Recursively call the main matchTypePattern function.
        // The parentOfPattern for this sub-match is the patternAsChoice itself.
        const optionMatchResult = matchTypePattern(
          pOpt,
          aOpt,
          permutationAttemptBindings,
          patternAsChoice,
        );

        if (optionMatchResult) {
          permutationAttemptBindings = optionMatchResult; // Update bindings for the next option in this permutation
        } else {
          possibleThisPermutation = false; // This permutation failed
          break;
        }
      }

      if (possibleThisPermutation && permutationAttemptBindings) {
        return permutationAttemptBindings; // Found a successful permutation
      }
    }
    return undefined; // No permutation resulted in a successful match
  }

  // --- 1. Pattern is Generic ---
  if (pattern.name === TypeName.Generic) {
    const name = (pattern as IGenericType).letter;
    const existingBinding = bindings[name];

    if (existingBinding) {
      if (
        !deepEqual(existingBinding, actual) &&
        !(
          parentOfPattern?.name === TypeName.Single &&
          existingBinding.name === TypeName.Single &&
          deepEqual((existingBinding as ISingleType).ofType, actual)
        )
      ) {
        return undefined;
      }
      return { ...bindings };
    } else {
      const newBindings = { ...bindings };
      newBindings[name] = actual;
      return newBindings;
    }
  }

  // --- 2. Actual is Single, Pattern is Not ---
  if (actual.name === TypeName.Single && pattern.name !== TypeName.Single) {
    return matchTypePattern(
      pattern,
      (actual as ISingleType).ofType,
      bindings,
      undefined,
    );
  }

  // --- 3. Pattern is Choice ---
  if (pattern.name === TypeName.Choice) {
    if (actual.name === TypeName.Choice) {
      // Handle Choice-pattern-vs-Choice-actual using the helper
      return matchChoiceToChoice(pattern, actual, bindings);
    } else {
      // Actual is not a Choice. Original logic: try to match actual against one of pattern's options.
      for (const option of pattern.options) {
        const branchBindings = matchTypePattern(
          option,
          actual,
          bindings,
          pattern,
        );
        if (branchBindings) {
          return branchBindings;
        }
      }
      return undefined;
    }
  }

  // --- 4. Core Type Compatibility ---
  if (pattern.name !== actual.name && !isSubtypeOf(actual, pattern)) {
    return undefined;
  }

  // --- 5. Recursive Matching for Structured Pattern Types ---
  const currentBindingsStep5 = { ...bindings }; // Use a distinct variable name

  if (pattern.name === TypeName.Single || pattern.name === TypeName.Type) {
    if (pattern.name !== actual.name) {
      return undefined;
    }
    const subPattern = (pattern as ISingleType | ITypeType).ofType;
    const subActual = (actual as ISingleType | ITypeType).ofType;
    return matchTypePattern(
      subPattern,
      subActual,
      currentBindingsStep5,
      pattern,
    );
  }

  if (pattern.name === TypeName.Lambda) {
    if (pattern.name !== actual.name) return undefined;
    const patternLambda = pattern as ILambdaType;
    const actualLambda = actual as ILambdaType;
    const bindingsAfterReturnMatch = matchTypePattern(
      patternLambda.returnType,
      actualLambda.returnType,
      currentBindingsStep5,
      pattern,
    );
    if (!bindingsAfterReturnMatch) return undefined;
    return matchTypePattern(
      patternLambda.contextType,
      actualLambda.contextType,
      bindingsAfterReturnMatch,
      pattern,
    );
  }

  if (pattern.name === TypeName.Complex) {
    if (pattern.name !== actual.name) return undefined;
    const patternComplex = pattern as IComplexType;
    const actualComplex = actual as IComplexType;

    // make sure arrays are equal patternComplex.schemaReference, actualComplex.schemaReference
    if (
      patternComplex.schemaReference.length !==
      actualComplex.schemaReference.length
    ) {
      return undefined;
    }
    // Check if all elements in the arrays are equal
    for (let i = 0; i < patternComplex.schemaReference.length; i++) {
      if (
        patternComplex.schemaReference[i] !== actualComplex.schemaReference[i]
      ) {
        return undefined;
      }
    }
    return currentBindingsStep5;
  }

  if (pattern.name === TypeName.Invalid) {
    if (pattern.name !== actual.name) return undefined;
    const patternInvalid = pattern as IInvalidType;
    const actualInvalid = actual as IInvalidType;
    if (patternInvalid.error !== actualInvalid.error) {
      return undefined;
    }
    return currentBindingsStep5;
  }

  // --- 6. Default Case: Simple Types or UnknownType Pattern ---
  return currentBindingsStep5; // Or initial `bindings` if currentBindingsStep5 wasn't modified
}

export function substituteBindings(
  type: Type,
  bindings: Record<string, Type>,
): Type {
  if (!type || typeof type !== "object") return type;

  if (type.name === TypeName.Generic) {
    const name = type.letter;
    return bindings[name] || type;
  }

  if (type.name === TypeName.Single) {
    return SingleType(substituteBindings(type.ofType, bindings));
  }

  if (type.name === TypeName.Type) {
    return TypeType(substituteBindings(type.ofType, bindings));
  }

  if (type.name === TypeName.Choice) {
    return ChoiceType(
      type.options.map((t: Type) => substituteBindings(t, bindings)),
    );
  }

  if (type.name === TypeName.Lambda) {
    return LambdaType(
      substituteBindings(type.returnType, bindings),
      substituteBindings(type.contextType, bindings),
    );
  }

  return type;
}

export const standardTypeMap: Record<string, Type> = {
  [TypeName.Integer]: IntegerType,
  [TypeName.Decimal]: DecimalType,
  [TypeName.String]: StringType,
  [TypeName.Boolean]: BooleanType,
  [TypeName.Date]: DateType,
  [TypeName.DateTime]: DateTimeType,
  [TypeName.Time]: TimeType,
  [TypeName.Quantity]: QuantityType,
  [TypeName.Null]: NullType,
  [TypeName.Unknown]: UnknownType,
};

export const primitiveTypeMap: Record<string, Type> = {
  string: PrimitiveStringType,
  boolean: PrimitiveBooleanType,
  integer: PrimitiveIntegerType,
  positiveInteger: PrimitivePositiveIntegerType,
  unsignedInteger: PrimitiveUnsignedIntegerType,
  decimal: PrimitiveDecimalType,
  uri: PrimitiveUriType,
  url: PrimitiveUrlType,
  canonical: PrimitiveCanonicalType,
  oid: PrimitiveOidType,
  id: PrimitiveIdType,
  markdown: PrimitiveMarkdownType,
  code: PrimitiveCodeType,
  dateTime: PrimitiveDateTimeType,
  date: PrimitiveDateType,
  instant: PrimitiveInstantType,
  time: PrimitiveTimeType,
  uuid: PrimitiveUuidType,
  xhtml: PrimitiveXhtmlType,
  base64Binary: PrimitiveBase64BinaryType,
};

export const typePrimitiveMap: Partial<Record<TypeName, string>> =
  Object.fromEntries(
    Object.entries(primitiveTypeMap).map(([key, value]) => [value.name, key]),
  );

export function stringifyType(t: Type): string {
  switch (t.name) {
    case TypeName.Single:
      return `Single<${stringifyType(t.ofType)}>`;
    case TypeName.Generic:
      return `${t.letter}`;
    case TypeName.Type:
      return `Type<${stringifyType(t.ofType)}>`;
    case TypeName.Lambda:
      return `Lambda<${stringifyType(t.contextType)} => ${stringifyType(
        t.returnType,
      )}>`;
    case TypeName.Choice:
      return t.options.map(stringifyType).join(" | ");
    case TypeName.Invalid:
      return `Invalid${t.error ? ` (${t.error})` : ""}`;
    case TypeName.Complex:
      return `${t.schemaReference[0]}${t.schemaReference
        .slice(1)
        .map((field) => `["${field}"]`)
        .join("")}`;
    default:
      if (typePrimitiveMap[t.name]) {
        return `Primitive<${typePrimitiveMap[t.name]}>`;
      }
      return t.name;
  }
}
