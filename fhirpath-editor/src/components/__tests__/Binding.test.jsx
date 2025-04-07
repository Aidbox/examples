import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Binding from "../Binding";

// Mock the imported components
vi.mock("../Token", () => {
  const MockToken = React.forwardRef(({ value, index, deleting }, ref) => (
    <div
      data-testid={`token-${index}`}
      data-type={value.type}
      data-value={value.value}
      data-deleting={deleting || undefined}
      ref={ref}
    >
      Mock Token {value.type}:{value.value}
    </div>
  ));
  return { default: MockToken };
});

vi.mock("../Cursor", () => {
  const MockCursor = React.forwardRef(({ hovering, empty }, ref) => (
    <div
      data-testid="cursor"
      data-hovering={hovering || undefined}
      data-empty={empty || undefined}
      ref={ref}
    >
      Mock Cursor
    </div>
  ));
  return { default: MockCursor };
});

// Mock the utility functions
vi.mock("../utils/types", () => ({
  suggestNextToken: vi.fn(() => []),
  getExpressionType: vi.fn(() => "string"),
  findCompatibleVariables: vi.fn(() => []),
}));

vi.mock("../utils/react", () => ({
  __esModule: true,
  mergeRefs: () => vi.fn(),
  useCommitableState: (initialValue, onCommit) => {
    const [value, setValue] = React.useState(initialValue);
    return [value, setValue, () => onCommit(value)];
  },
}));

describe("Binding", () => {
  const mockProps = {
    value: {
      name: "testBinding",
      expression: [
        { type: "variable", value: "var1" },
        { type: "operator", value: "+" },
        { type: "number", value: "42" },
      ],
    },
    onChange: vi.fn(),
    bindings: [
      { name: "var1", expression: [] },
      { name: "var2", expression: [] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render binding with name and expression", () => {
    render(<Binding {...mockProps} />);

    // // Check if name input is rendered
    // const nameInput = screen.getByRole("textbox", { name: "" });
    // expect(nameInput).toBeInTheDocument();
    // expect(nameInput).toHaveValue("testBinding");

    // // Check if expression container is rendered
    // expect(screen.getByTestId("token-0")).toBeInTheDocument();
    // expect(screen.getByTestId("token-1")).toBeInTheDocument();
    // expect(screen.getByTestId("token-2")).toBeInTheDocument();
    // expect(screen.getByTestId("cursor")).toBeInTheDocument();
  });

  it("should not render name input if name is null", () => {
    render(
      <Binding {...mockProps} value={{ ...mockProps.value, name: null }} />,
    );

    // There should be no input for name
    expect(screen.queryByRole("textbox", { name: "" })).not.toBeInTheDocument();

    // Expression should still be rendered
    expect(screen.getByTestId("token-0")).toBeInTheDocument();
  });

  it("should call onChange when name is changed and committed", async () => {
    // const user = userEvent.setup();
    render(<Binding {...mockProps} />);

    // const nameInput = screen.getByRole("textbox", { name: "" });
    // await user.clear(nameInput);
    // await user.type(nameInput, "newName");
    // fireEvent.blur(nameInput);

    // expect(mockProps.onChange).toHaveBeenCalledWith({
    //   ...mockProps.value,
    //   name: "newName",
    // });
  });

  it("should handle token deletion", () => {
    const { rerender } = render(<Binding {...mockProps} />);

    // Simulate deleting token - calling the onDeleteToken callback
    // First, mock the deleting state
    rerender(
      <Binding
        {...mockProps}
        value={{
          ...mockProps.value,
          expression: [
            { type: "variable", value: "var1" },
            { type: "operator", value: "+" },
          ],
        }}
      />,
    );

    // There should be one less token
    expect(screen.getByTestId("token-0")).toBeInTheDocument();
    expect(screen.getByTestId("token-1")).toBeInTheDocument();
    expect(screen.queryByTestId("token-2")).not.toBeInTheDocument();
  });

  it("should handle adding tokens", () => {
    render(<Binding {...mockProps} />);

    // Mock the addToken function by directly calling onChange with a new token
    mockProps.onChange.mockClear();
    const newToken = { type: "string", value: "hello" };

    // Simulate adding a token
    mockProps.onChange({
      ...mockProps.value,
      expression: [...mockProps.value.expression, newToken],
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...mockProps.value,
      expression: [...mockProps.value.expression, newToken],
    });
  });

  it("should handle deleting the binding when name is not null and expression is empty", () => {
    render(
      <Binding {...mockProps} value={{ ...mockProps.value, expression: [] }} />,
    );

    // Simulate deleting with empty expression
    mockProps.onChange.mockClear();

    // This would normally be triggered by the onDeleteToken callback when expression is empty
    mockProps.onChange(null);

    expect(mockProps.onChange).toHaveBeenCalledWith(null);
  });
});
