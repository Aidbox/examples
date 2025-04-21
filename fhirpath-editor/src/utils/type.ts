import {
  GenericLetter,
  type IBooleanType,
  type IChoiceType,
  type IDateTimeType,
  type IDateType,
  type IDecimalType,
  type IGenericType,
  type IIntegerType,
  type IInvalidType,
  type ILambdaType,
  type INullType,
  type IQuantityType,
  type ISingleType,
  type IStringType,
  type ITimeType,
  type IType,
  type ITypeType,
  TypeName,
} from "@/types/internal";

export const IntegerType: IIntegerType = { type: TypeName.Integer };
export const DecimalType: IDecimalType = { type: TypeName.Decimal };
export const StringType: IStringType = { type: TypeName.String };
export const BooleanType: IBooleanType = { type: TypeName.Boolean };
export const DateType: IDateType = { type: TypeName.Date };
export const DateTimeType: IDateTimeType = { type: TypeName.DateTime };
export const TimeType: ITimeType = { type: TypeName.Time };
export const QuantityType: IQuantityType = { type: TypeName.Quantity };
export const NullType: INullType = { type: TypeName.Null };

export const InvalidType = (error: string): IInvalidType => ({
  type: TypeName.Invalid,
  error,
});

export const TypeType = (ofType: IType): ITypeType => ({
  type: TypeName.Type,
  ofType,
});

export const SingleType = (ofType: IType): ISingleType => ({
  type: TypeName.Single,
  ofType,
});

export const ChoiceType = (options: IType[]): IChoiceType => ({
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
  returnType: IType,
  contextType: IType,
): ILambdaType => ({
  type: TypeName.Lambda,
  returnType,
  contextType,
});

const typeHierarchy: Partial<Record<TypeName, TypeName[]>> = {};

export function extendType(subtype: IType, ...supertypes: IType[]): void {
  if (!subtype || !supertypes) return;
  const currentSupertypes = typeHierarchy[subtype.type] || [];
  typeHierarchy[subtype.type] = Array.from(
    new Set([...currentSupertypes, ...supertypes.map((s) => s.type)]),
  );
}

export function isSubtypeOf(actual: IType, expected: IType): boolean {
  const a = actual.type;
  const e = expected.type;

  if (a === e) return true;

  const seen = new Set<TypeName>();
  const queue = [a];

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

export function wrapSingle(t: IType): ISingleType {
  if (t.type === TypeName.Single) return t;
  return SingleType(t);
}

export function unwrapSingle(t: IType): IType {
  return t?.type === TypeName.Single ? t.ofType : t;
}

export function normalizeChoice(choice: IChoiceType): IType {
  const options = [...choice.options];

  const seen: IType[] = [];
  while (options.length > 0) {
    const opt = options.shift();
    if (opt && !seen.some((t) => deepEqual(t, opt))) {
      if (opt.type === TypeName.Choice) {
        const normalized = normalizeChoice(opt);
        if (normalized.type === TypeName.Choice) {
          options.push(...normalized.options);
        } else {
          options.push(normalized);
        }
      } else {
        seen.push(opt);
      }
    }
  }

  return seen.length === 1 ? seen[0] : ChoiceType(seen);
}

export function promote(a: IType, b: IType): IType | undefined {
  const t1 = a.type;
  const t2 = b.type;

  if (t1 === t2) return a;

  const map: Partial<Record<TypeName, Partial<Record<TypeName, IType>>>> = {
    Integer: { Decimal: DecimalType, Quantity: QuantityType },
    Decimal: { Integer: DecimalType, Quantity: QuantityType },
    Quantity: { Integer: QuantityType, Decimal: QuantityType },
  } as const;

  const result = map[t1]?.[t2] || map[t2]?.[t1];
  return result || undefined;
}

export function mergeBindings(
  a: Record<string, IType>,
  b: Record<string, IType>,
): Record<string, IType> | undefined {
  const result = { ...a };
  for (const key in b) {
    if (key in result) {
      if (!deepEqual(result[key], b[key])) return undefined;
    } else {
      result[key] = b[key];
    }
  }
  return result;
}

export function deepEqual(a: any, b: any): boolean {
  if (a?.type === TypeName.Generic || b?.type === TypeName.Generic) {
    return true;
  }
  if (a?.type === TypeName.Choice) {
    return a.options.some((opt: IType) => deepEqual(opt, b));
  }
  if (b?.type === TypeName.Choice) {
    return b.options.some((opt: IType) => deepEqual(opt, a));
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
  pattern: IType | undefined,
  actual: IType | undefined,
  bindings: Record<string, IType> = {},
  parentOfPattern?: IType,
): Record<string, IType> | undefined {
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
        pattern[key as keyof IType] as unknown as IType,
        actual[key as keyof IType] as unknown as IType,
        newBindings,
        pattern,
      );
      if (!sub) return undefined;
      const merged = mergeBindings(newBindings, sub);
      if (!merged) return undefined;
      newBindings = merged;
    } else if (
      !deepEqual(pattern[key as keyof IType], actual[key as keyof IType])
    )
      return undefined;
  }

  return newBindings;
}

export function substituteBindings(
  type: IType,
  bindings: Record<string, IType>,
): IType {
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
      type.options.map((t: IType) => substituteBindings(t, bindings)),
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
