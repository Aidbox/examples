import { DeepPartial } from "../types/internal.ts";

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

export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K,
): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

export function indexBy<T, K extends keyof T>(
  array: T[],
  key: K,
): Record<string, T> {
  return array.reduce(
    (acc, item) => {
      const indexKey = String(item[key]);
      acc[indexKey] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = target[key as keyof typeof target];

      if (isObject(sourceValue)) {
        if (!(key in target)) {
          output[key as keyof T] = sourceValue as T[keyof T];
        } else if (isObject(targetValue)) {
          output[key as keyof T] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as DeepPartial<Record<string, unknown>>,
          ) as T[keyof T];
        } else {
          output[key as keyof T] = sourceValue as T[keyof T];
        }
      } else if (sourceValue !== undefined) {
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    });
  }

  return output;
}

export const colors = {
  variable: "#1976d2", // vivid blue
  operator: "#388e3c", // deep green
  function: "#f57c00", // strong orange
  field: "#7b1fa2", // deep purple
  index: "#00796b", // teal
  answer: "#c2185b", // raspberry pink
  literal: "#5d4037", // dark brown
} satisfies Record<string, string>;

export const weights = {
  answer: 0,
  variable: 1,
  literal: 2,
  operator: 3,
  function: 4,
  field: 5,
  index: 6,
} satisfies Record<string, number>;

export function scrollIntoView(
  element: HTMLElement,
  options: ScrollIntoViewOptions & { offset?: string },
) {
  delay(() => {
    const { offset, ...rest } = options;

    const pos = element.style.position;
    const top = element.style.top;

    if (offset) {
      element.style.position = "relative";
      element.style.top = offset;
    }

    element.scrollIntoView(rest);

    if (offset) {
      element.style.top = top;
      element.style.position = pos;
    }
  });
}
