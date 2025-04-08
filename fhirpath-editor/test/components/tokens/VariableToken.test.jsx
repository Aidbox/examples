import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VariableToken from "@components/tokens/VariableToken";

// Mock the utility function
vi.mock("@utils/type", () => ({
  findCompatibleVariables: vi.fn((bindings) => bindings),
}));

describe("VariableToken", () => {
  const mockProps = {
    token: { type: "variable", value: "testVar" },
    onChange: vi.fn(),
    bindings: [
      { name: "testVar", expression: [] },
      { name: "anotherVar", expression: [] },
    ],
    expression: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<VariableToken {...mockProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("testVar");
  });

  it("should render all binding options in the dropdown", () => {
    render(<VariableToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Open dropdown
    fireEvent.focus(select);

    // Should have options for each binding
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveValue("testVar");
    expect(options[1]).toHaveValue("anotherVar");
  });

  it("should call onChange when selection changes", () => {
    render(<VariableToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "anotherVar" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "variable",
      value: "anotherVar",
    });
  });

  it("should have proper styling for the token", () => {
    render(<VariableToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Variable tokens typically have special styling
    expect(select).toHaveClass("text-green-800");
  });

  it("should apply focus styling", () => {
    render(<VariableToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    fireEvent.focus(select);
    expect(select).toHaveClass("focus:outline-none");
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<VariableToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("testVar");
  });
});
