import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import * as sut from "./misc";
import type { DeepPartial } from "../types/internal"; // Assuming this path is correct relative to the test file

describe("distinct", () => {
  test("should return an array with unique elements", () => {
    const input = [1, 2, 2, 3, 4, 4, 5];
    const expected = [1, 2, 3, 4, 5];
    expect(sut.distinct(input)).toEqual(expected);
  });

  test("should return an empty array if input is empty", () => {
    expect(sut.distinct([])).toEqual([]);
  });

  test("should handle arrays with objects (reference equality)", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const input = [obj1, obj2, obj1];
    const expected = [obj1, obj2];
    expect(sut.distinct(input)).toEqual(expected);
  });
});

describe("delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should execute the function after a delay", () => {
    const mockFn = vi.fn();
    sut.delay(mockFn);
    expect(mockFn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("should return a timeout ID", () => {
    const mockFn = vi.fn();
    const timeoutId = sut.delay(mockFn);
    expect(timeoutId).toBeTruthy();
    vi.clearAllTimers();
  });
});

describe("upperFirst", () => {
  test("capitalizes the first letter of a string", () => {
    expect(sut.upperFirst("hello")).toBe("Hello");
  });

  test("handles an already capitalized string", () => {
    expect(sut.upperFirst("World")).toBe("World");
  });

  test("handles single character strings", () => {
    expect(sut.upperFirst("a")).toBe("A");
  });

  test("handles empty strings", () => {
    expect(sut.upperFirst("")).toBe("");
  });
});

describe("truncate", () => {
  test("should not truncate if string length is less than max", () => {
    expect(sut.truncate("hello", 10)).toBe("hello");
  });

  test("should not truncate if string length is equal to max", () => {
    expect(sut.truncate("hello", 5)).toBe("hello");
  });

  test("should truncate if string length is greater than max", () => {
    expect(sut.truncate("hello world", 5)).toBe("hello...");
  });

  test("should handle max of 0", () => {
    expect(sut.truncate("hello", 0)).toBe("...");
  });

  test("should handle empty string", () => {
    expect(sut.truncate("", 5)).toBe("");
  });
});

describe("pick", () => {
  const obj = { a: 1, b: "two", c: true, d: { nested: "yes" } };

  test("should pick specified keys from an object", () => {
    const result = sut.pick(obj, ["a", "c"]);
    expect(result).toEqual({ a: 1, c: true });
    expect(Object.keys(result).length).toBe(2);
  });

  test("should return an empty object if no keys are specified", () => {
    const result = sut.pick(obj, []);
    expect(result).toEqual({});
  });

  test("should return an empty object if keys don't exist (though TS should prevent this)", () => {
    // @ts-expect-error testing runtime behavior for non-existent keys
    const result = sut.pick(obj, ["x", "y"]);
    expect(result).toEqual({});
  });

  test("should handle picking all keys", () => {
    const result = sut.pick(obj, ["a", "b", "c", "d"]);
    expect(result).toEqual(obj);
  });
});

describe("omit", () => {
  const obj = { a: 1, b: "two", c: true, d: { nested: "yes" } };

  test("should omit specified keys from an object", () => {
    const result = sut.omit(obj, ["b", "d"]);
    expect(result).toEqual({ a: 1, c: true });
    expect(Object.keys(result).length).toBe(2);
  });

  test("should return the original object if no keys are specified for omission", () => {
    const result = sut.omit(obj, []);
    expect(result).toEqual(obj);
  });

  test("should return the original object if keys to omit don't exist", () => {
    // @ts-expect-error testing runtime behavior for non-existent keys
    const result = sut.omit(obj, ["x", "y"]);
    expect(result).toEqual(obj);
  });

  test("should return an empty object if all keys are omitted", () => {
    const result = sut.omit(obj, ["a", "b", "c", "d"]);
    expect(result).toEqual({});
  });
});

describe("assertDefined", () => {
  test("should not throw an error if value is defined", () => {
    expect(() => sut.assertDefined(0, "Value is 0")).not.toThrow();
    expect(() => sut.assertDefined("", "Value is empty string")).not.toThrow();
    expect(() => sut.assertDefined({}, "Value is object")).not.toThrow();
  });

  test("should throw an error if value is undefined", () => {
    expect(() => sut.assertDefined(undefined)).toThrow("Value is undefined");
  });

  test("should throw an error with a custom message if value is undefined", () => {
    const customMessage = "This specific value must be defined.";
    expect(() => sut.assertDefined(undefined, customMessage)).toThrow(
      customMessage,
    );
  });
});

describe("never", () => {
  test("should always throw an error", () => {
    expect(() => sut.never("test value")).toThrow();
  });

  test("should throw an error with a default message", () => {
    expect(() => sut.never("test value")).toThrow(
      "Unexpected value: test value",
    );
  });

  test("should throw an error with a custom message", () => {
    const customMessage = "This should never happen.";
    expect(() => sut.never("test value", customMessage)).toThrow(customMessage);
  });
});

describe("buildPositionIndex", () => {
  test("should build a position index for an array of objects with id", () => {
    const objects = [
      { id: "a", data: "apple" },
      { id: "b", data: "banana" },
      { id: "c", data: "cherry" },
    ];
    const expected = { a: 0, b: 1, c: 2 };
    expect(sut.buildPositionIndex(objects)).toEqual(expected);
  });

  test("should return an empty object for an empty array", () => {
    expect(sut.buildPositionIndex([])).toEqual({});
  });

  test("should handle objects with numeric ids (if they are strings)", () => {
    const objects = [
      { id: "1", data: "one" },
      { id: "2", data: "two" },
    ];
    const expected = { "1": 0, "2": 1 };
    expect(sut.buildPositionIndex(objects)).toEqual(expected);
  });
});

describe("groupBy", () => {
  const items = [
    { id: 1, category: "A", name: "Item 1" },
    { id: 2, category: "B", name: "Item 2" },
    { id: 3, category: "A", name: "Item 3" },
    { id: 4, category: "C", name: "Item 4" },
    { id: 5, category: "B", name: "Item 5" },
  ];

  test("should group items by the specified key", () => {
    const result = sut.groupBy(items, "category");
    expect(result).toEqual({
      A: [
        { id: 1, category: "A", name: "Item 1" },
        { id: 3, category: "A", name: "Item 3" },
      ],
      B: [
        { id: 2, category: "B", name: "Item 2" },
        { id: 5, category: "B", name: "Item 5" },
      ],
      C: [{ id: 4, category: "C", name: "Item 4" }],
    });
  });

  test("should handle numeric keys for grouping (converted to string)", () => {
    const result = sut.groupBy(items, "id");
    expect(result["1"]).toEqual([{ id: 1, category: "A", name: "Item 1" }]);
    expect(result["2"]).toEqual([{ id: 2, category: "B", name: "Item 2" }]);
  });

  test("should return an empty object for an empty array", () => {
    expect(sut.groupBy([], "category")).toEqual({});
  });

  test("should create new groups if key values are new", () => {
    const moreItems = [...items, { id: 6, category: "D", name: "Item 6" }];
    const result = sut.groupBy(moreItems, "category");
    expect(result["D"]).toEqual([{ id: 6, category: "D", name: "Item 6" }]);
  });
});

describe("indexBy", () => {
  const items = [
    { id: "a1", name: "Alice", age: 30 },
    { id: "b2", name: "Bob", age: 25 },
    { id: "c3", name: "Charlie", age: 35 },
  ];

  test("should index items by the specified key", () => {
    const result = sut.indexBy(items, "id");
    expect(result).toEqual({
      a1: { id: "a1", name: "Alice", age: 30 },
      b2: { id: "b2", name: "Bob", age: 25 },
      c3: { id: "c3", name: "Charlie", age: 35 },
    });
  });

  test("should use stringified version of the key value", () => {
    const numericKeyItems = [
      { key: 1, value: "one" },
      { key: 2, value: "two" },
    ];
    const result = sut.indexBy(numericKeyItems, "key");
    expect(result).toEqual({
      "1": { key: 1, value: "one" },
      "2": { key: 2, value: "two" },
    });
  });

  test("should overwrite if keys are not unique (last one wins)", () => {
    const nonUniqueKeyItems = [
      { group: "X", value: 10 },
      { group: "Y", value: 20 },
      { group: "X", value: 30 }, // This will overwrite the first "X"
    ];
    const result = sut.indexBy(nonUniqueKeyItems, "group");
    expect(result).toEqual({
      X: { group: "X", value: 30 },
      Y: { group: "Y", value: 20 },
    });
  });

  test("should return an empty object for an empty array", () => {
    expect(sut.indexBy([], "id")).toEqual({});
  });
});

describe("deepMerge", () => {
  test("should merge two simple objects", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const expected = { a: 1, b: 3, c: 4 };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should perform a deep merge for nested objects", () => {
    const target: Record<string, unknown> = {
      a: 1,
      b: { x: 10, y: 20 },
      d: 100,
    };
    const source: DeepPartial<typeof target> = { b: { y: 30, z: 40 }, c: 50 };
    const expected = { a: 1, b: { x: 10, y: 30, z: 40 }, c: 50, d: 100 };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should add new properties from source to target", () => {
    const target: Record<string, unknown> = { a: 1 };
    const source = { b: { nested: "value" } };
    const expected = { a: 1, b: { nested: "value" } };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should overwrite primitive values in target with values from source", () => {
    const target = { a: 1, b: "hello" };
    const source = { b: "world", c: true };
    const expected = { a: 1, b: "world", c: true };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should not modify the original target object", () => {
    const target: Record<string, unknown> = { a: 1, b: { x: 10 } };
    const source = { b: { y: 20 } };
    sut.deepMerge(target, source);
    expect(target).toEqual({ a: 1, b: { x: 10 } }); // Original target remains unchanged
  });

  test("should handle source with undefined values (they should not overwrite or be added)", () => {
    const target = { a: 1, b: "defined" };
    const source: DeepPartial<typeof target> & { c?: string } = {
      b: undefined,
      c: undefined,
    };
    const result = sut.deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: "defined" }); // b is not overwritten, c is not added
  });

  test("should replace non-object target property with object source property", () => {
    const target: Record<string, unknown> = { a: 1, b: "not an object" };
    const source = { b: { is: "an object" } };
    const expected = { a: 1, b: { is: "an object" } };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should handle empty target object", () => {
    const target = {};
    const source = { a: 1, b: { nested: true } };
    const expected = { a: 1, b: { nested: true } };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should handle empty source object", () => {
    const target = { a: 1, b: { nested: true } };
    const source = {};
    const expected = { a: 1, b: { nested: true } }; // Should return a copy of target
    expect(sut.deepMerge(target, source)).toEqual(expected);
    expect(sut.deepMerge(target, source)).not.toBe(target); // Ensure it's a copy
  });

  test("should correctly merge when source has a new nested object not in target", () => {
    const target: Record<string, unknown> = { a: 1 };
    const source = { b: { c: 2 } };
    const expected = { a: 1, b: { c: 2 } };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should handle arrays (arrays are treated as values and replaced, not merged)", () => {
    const target = { a: [1, 2], b: { arr: [10, 20] } };
    const source: DeepPartial<typeof target> = {
      a: [3, 4],
      b: { arr: [30] },
    };
    const expected = { a: [3, 4], b: { arr: [30] } };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("should handle null values in source by replacing target values", () => {
    const target: Record<string, unknown> = { a: 1, b: { x: 10 } };
    const source: DeepPartial<typeof target> = { a: null, b: null };
    const expected = { a: null, b: null };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });

  test("complex nested structure with new and existing keys", () => {
    const target: Record<string, unknown> = {
      user: { name: "Alice", details: { age: 30, city: "Wonderland" } },
      settings: { theme: "dark" },
    };
    const source: DeepPartial<typeof target> = {
      user: { details: { age: 31, occupation: "Explorer" } },
      settings: { notifications: true },
      newProp: { value: 123 },
    };
    const expected = {
      user: {
        name: "Alice",
        details: { age: 31, city: "Wonderland", occupation: "Explorer" },
      },
      settings: { theme: "dark", notifications: true },
      newProp: { value: 123 },
    };
    expect(sut.deepMerge(target, source)).toEqual(expected);
  });
});
