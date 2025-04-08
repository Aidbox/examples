// This file provides vitest mock functions to be imported by token tests
import { vi } from "vitest";

// Create mock functions
export const mockFn = vi.fn;

// Create mock implementations
export const mockModules = {
  "@utils/type": {
    findCompatibleVariables: vi.fn((bindings) => bindings),
    getCompatibleOperators: vi.fn(() => ["+", "-", "*", "/"]),
    getAvailableFields: vi.fn(() => ["name", "id", "status"]),
  },
};

// Mock implementations for React components
export const mockToken = (testId, content) => {
  return ({ ref }) => (
    <div data-testid={testId} ref={ref}>
      {content}
    </div>
  );
};
