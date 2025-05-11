import {
  type GenericLetter,
  type IAnyType,
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
  type Type,
  TypeName,
} from "../types/internal";
import { assertDefined } from "./misc.ts";

const typeHierarchy: Partial<Record<TypeName, TypeName[]>> = {};

export function extendType<T extends Type>(supertype: Type, subtype: T): T {
  const currentSupertypes = typeHierarchy[subtype.type] || [];
  typeHierarchy[subtype.type] = Array.from(
    new Set([...currentSupertypes, supertype.type]),
  );

  return subtype;
}

export function isSubtypeOf(actual: Type, expected: Type): boolean {
  const a = actual.type;
  const e = expected.type;

  if (a === e) return true;
  if (e === TypeName.Any) return true;
  if (a === TypeName.Any) return false;

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
export const IntegerType: IIntegerType = { type: TypeName.Integer };

export const DecimalType: IDecimalType = { type: TypeName.Decimal };

export const StringType: IStringType = { type: TypeName.String };

export const BooleanType: IBooleanType = { type: TypeName.Boolean };

export const DateType: IDateType = { type: TypeName.Date };

export const DateTimeType: IDateTimeType = { type: TypeName.DateTime };

export const TimeType: ITimeType = { type: TypeName.Time };

export const QuantityType: IQuantityType = { type: TypeName.Quantity };

export const NullType: INullType = { type: TypeName.Null };

export const AnyType: IAnyType = { type: TypeName.Any };

export const PrimitiveCodeType: IPrimitiveCodeType = extendType(StringType, {
  type: TypeName.PrimitiveCode,
});

export const PrimitiveBooleanType: IPrimitiveBooleanType = extendType(
  BooleanType,
  {
    type: TypeName.PrimitiveBoolean,
  },
);

export const PrimitiveStringType: IPrimitiveStringType = extendType(
  StringType,
  {
    type: TypeName.PrimitiveString,
  },
);

export const PrimitiveUriType: IPrimitiveUriType = extendType(StringType, {
  type: TypeName.PrimitiveUri,
});

export const PrimitiveDateType: IPrimitiveDateType = extendType(DateType, {
  type: TypeName.PrimitiveDate,
});

export const PrimitiveDateTimeType: IPrimitiveDateTimeType = extendType(
  DateTimeType,
  {
    type: TypeName.PrimitiveDateTime,
  },
);

export const PrimitiveDecimalType: IPrimitiveDecimalType = extendType(
  DecimalType,
  {
    type: TypeName.PrimitiveDecimal,
  },
);

export const PrimitiveMarkdownType: IPrimitiveMarkdownType = extendType(
  StringType,
  {
    type: TypeName.PrimitiveMarkdown,
  },
);

export const PrimitiveCanonicalType: IPrimitiveCanonicalType = extendType(
  StringType,
  {
    type: TypeName.PrimitiveCanonical,
  },
);

export const PrimitiveTimeType: IPrimitiveTimeType = extendType(TimeType, {
  type: TypeName.PrimitiveTime,
});

export const PrimitiveIdType: IPrimitiveIdType = extendType(StringType, {
  type: TypeName.PrimitiveId,
});

export const PrimitiveIntegerType: IPrimitiveIntegerType = extendType(
  IntegerType,
  {
    type: TypeName.PrimitiveInteger,
  },
);

export const PrimitivePositiveIntegerType: IPrimitivePositiveIntegerType =
  extendType(IntegerType, {
    type: TypeName.PrimitivePositiveInteger,
  });

export const PrimitiveUnsignedIntegerType: IPrimitiveUnsignedIntegerType =
  extendType(IntegerType, {
    type: TypeName.PrimitiveUnsignedInteger,
  });

export const PrimitiveInstantType: IPrimitiveInstantType = extendType(
  DateTimeType,
  {
    type: TypeName.PrimitiveInstant,
  },
);

export const PrimitiveUuidType: IPrimitiveUuidType = extendType(StringType, {
  type: TypeName.PrimitiveUuid,
});

export const PrimitiveUrlType: IPrimitiveUrlType = extendType(StringType, {
  type: TypeName.PrimitiveUrl,
});

export const PrimitiveOidType: IPrimitiveOidType = extendType(StringType, {
  type: TypeName.PrimitiveOid,
});

export const PrimitiveXhtmlType: IPrimitiveXhtmlType = extendType(StringType, {
  type: TypeName.PrimitiveXhtml,
});

export const PrimitiveBase64BinaryType: IPrimitiveBase64BinaryType = extendType(
  StringType,
  {
    type: TypeName.PrimitiveBase64Binary,
  },
);

export const ComplexType = (schemaReference: string[]): IComplexType => ({
  type: TypeName.Complex,
  schemaReference,
});

export const InvalidType = (error: string): IInvalidType => ({
  type: TypeName.Invalid,
  error,
});

export const TypeType = (ofType: Type): ITypeType => ({
  type: TypeName.Type,
  ofType,
});

export const SingleType = (ofType: Type): ISingleType => ({
  type: TypeName.Single,
  ofType,
});

export const ChoiceType = (options: Type[]): IChoiceType => ({
  type: TypeName.Choice,
  options,
});

export function Generic(name: GenericLetter): IGenericType {
  return {
    type: TypeName.Generic,
    name,
  };
}

export const LambdaType = (
  returnType: Type,
  contextType: Type,
): ILambdaType => ({
  type: TypeName.Lambda,
  returnType,
  contextType,
});

export function wrapSingle(t: Type): ISingleType {
  if (t.type === TypeName.Single) return t;
  return SingleType(t);
}

export function unwrapSingle(t: Type): Type {
  return t?.type === TypeName.Single ? t.ofType : t;
}

export function normalizeChoice(choice: IChoiceType): Type {
  // Recursively flatten options and check for AnyType presence.
  // If AnyType is found at any level, the entire choice becomes AnyType.
  const allFlattenedOptions: Type[] = [];
  const queue: Type[] = [...choice.options]; // Use a queue of Type for mixed types

  while (queue.length > 0) {
    const opt = queue.shift();
    if (!opt) continue;

    if (opt.type === TypeName.Any) {
      return AnyType; // AnyType in options simplifies the choice to AnyType
    }

    if (opt.type === TypeName.Choice) {
      // Instead of normalizing here, just add its options to the queue to check them for AnyType
      // This ensures that an AnyType deep inside nested choices is found.
      queue.push(...opt.options);
    } else {
      allFlattenedOptions.push(opt);
    }
  }

  // If we reach here, no AnyType was found in the flattened list.
  // Now, deduplicate the collected (non-AnyType) options.
  const uniqueOptions: Type[] = [];
  for (const opt of allFlattenedOptions) {
    // Check if an equivalent option (by deepEqual) is already in uniqueOptions
    if (!uniqueOptions.some((uo) => deepEqual(uo, opt))) {
      uniqueOptions.push(opt);
    }
  }

  // If, after deduplication, only one type remains, return it. Otherwise, return a new ChoiceType.
  return uniqueOptions.length === 1 && uniqueOptions[0]
    ? uniqueOptions[0]
    : ChoiceType(uniqueOptions);
}

export function promote(a: Type, b: Type): Type | undefined {
  const t1 = a.type;
  const t2 = b.type;

  if (t1 === t2) return a;

  if (t1 === TypeName.Any || t2 === TypeName.Any) return AnyType;

  const map: Partial<Record<TypeName, Partial<Record<TypeName, Type>>>> = {
    Integer: { Decimal: DecimalType, Quantity: QuantityType },
    Decimal: { Integer: DecimalType, Quantity: QuantityType },
    Quantity: { Integer: QuantityType, Decimal: QuantityType },
  } as const;

  const result = map[t1]?.[t2] || map[t2]?.[t1];
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

export function deepEqual(a: any, b: any): boolean {
  if (a?.type === TypeName.Generic || b?.type === TypeName.Generic) {
    return true;
  }
  if (a?.type === TypeName.Choice) {
    return a.options.some((opt: Type) => deepEqual(opt, b));
  }
  if (b?.type === TypeName.Choice) {
    return b.options.some((opt: Type) => deepEqual(opt, a));
  }

  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a == null || b == null) return a === b;

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  if ("type" in a && "type" in b) {
    if (a.type !== b.type && !isSubtypeOf(a, b) && !isSubtypeOf(b, a))
      return false;
    keys.delete("type");
  }

  for (const key of keys) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function matchTypePattern(
  pattern: Type | undefined,
  actual: Type | undefined,
  bindings: Record<string, Type> = {},
  parentOfPattern?: Type,
): Record<string, Type> | undefined {
  if (!pattern || !actual) return undefined;
  let newBindings = { ...bindings };

  // If pattern is a Generic, record or check consistency
  if (pattern.type === TypeName.Generic) {
    const name = pattern.name;

    if (bindings[name]) {
      if (
        !deepEqual(bindings[name], actual) &&
        !(
          parentOfPattern?.type === TypeName.Single &&
          bindings[name].type === TypeName.Single &&
          deepEqual(bindings[name].ofType, actual)
        )
      )
        return undefined;
    } else {
      newBindings[name] = actual;
    }
    return newBindings;
  }

  if (actual.type === TypeName.Single && pattern.type !== TypeName.Single) {
    // Promote Single to its ofType
    return matchTypePattern(pattern, actual.ofType, newBindings, undefined);
  }

  // Choice handling — try each branch
  if (pattern.type === TypeName.Choice) {
    for (const option of pattern.options) {
      const b = matchTypePattern(option, actual, newBindings, pattern);
      if (b) return b;
    }
    return undefined;
  }

  // Basic type mismatch
  if (typeof pattern !== "object" || typeof actual !== "object")
    return undefined;

  if (
    pattern.type &&
    actual.type &&
    pattern.type !== actual.type &&
    !isSubtypeOf(actual, pattern)
  ) {
    return undefined;
  }

  // Go through pattern keys
  for (const key of Object.keys(pattern)) {
    if (key === "type") continue;
    if (!(key in actual)) return undefined;

    if (key === "ofType" || key === "returnType" || key === "contextType") {
      const sub = matchTypePattern(
        pattern[key as keyof Type] as unknown as Type,
        actual[key as keyof Type] as unknown as Type,
        newBindings,
        pattern,
      );
      if (!sub) return undefined;
      const merged = mergeBindings(newBindings, sub);
      if (!merged) return undefined;
      newBindings = merged;
    } else if (
      !deepEqual(pattern[key as keyof Type], actual[key as keyof Type])
    )
      return undefined;
  }

  return newBindings;
}

export function substituteBindings(
  type: Type,
  bindings: Record<string, Type>,
): Type {
  if (!type || typeof type !== "object") return type;

  if (type.type === TypeName.Generic) {
    const name = type.name;
    return bindings[name] || type;
  }

  if (type.type === TypeName.Single) {
    return SingleType(substituteBindings(type.ofType, bindings));
  }

  if (type.type === TypeName.Choice) {
    return ChoiceType(
      type.options.map((t: Type) => substituteBindings(t, bindings)),
    );
  }

  if (type.type === TypeName.Lambda) {
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
  [TypeName.Any]: AnyType,
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
    Object.entries(primitiveTypeMap).map(([key, value]) => [value.type, key]),
  );

export function stringifyType(t: Type): string {
  switch (t.type) {
    case TypeName.Single:
      return `Single<${stringifyType(t.ofType)}>`;
    case TypeName.Generic:
      return `${t.name}`;
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
      if (typePrimitiveMap[t.type]) {
        return `Primitive<${typePrimitiveMap[t.type]}>`;
      }
      return t.type;
  }
}
