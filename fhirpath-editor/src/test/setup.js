import "@testing-library/jest-dom";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
