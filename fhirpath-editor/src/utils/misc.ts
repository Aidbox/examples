export const distinct = <T>(array: T[]): T[] => Array.from(new Set(array));

export const delay = (f: () => void): ReturnType<typeof setTimeout> =>
  setTimeout(f, 0);

export const upperFirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.includes(key as K)),
  ) as Pick<T, K>;

export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;

export const hasProperty = <T extends object, K extends PropertyKey>(
  obj: T,
  field: K,
): obj is T & Record<K, unknown> =>
  Object.prototype.hasOwnProperty.call(obj, field);

export function assertDefined<T>(
  value: T | undefined,
  message: string = "Value is undefined",
): asserts value is T {
  if (value === undefined) throw new Error(message);
}

export function never<T>(value: T, message?: string): never {
  throw new Error(message || `Unexpected value: ${value}`);
}

export function buildPositionIndex<T extends { id: string }>(
  objects: T[],
): { [key: string]: number } {
  return objects.reduce(
    (acc, obj, index) => {
      acc[obj.id] = index;
      return acc;
    },
    {} as { [key: string]: number },
  );
}
