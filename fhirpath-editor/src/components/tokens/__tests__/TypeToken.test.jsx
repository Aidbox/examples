import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TypeToken from "../TypeToken";

describe("TypeToken", () => {
  const mockProps = {
    token: { type: "type", value: "String" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<TypeToken {...mockProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("String");
  });

  it("should call onChange when selection changes", () => {
    render(<TypeToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "Boolean" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "type",
      value: "Boolean",
    });
  });

  it("should show all FHIRPath types in the dropdown", () => {
    render(<TypeToken {...mockProps} />);
    const select = screen.getByTestId("type-token");

    // Check that essential FHIRPath types are available as options
    const options = Array.from(select.options).map((option) => option.value);

    // Check for basic FHIRPath types
    expect(options).toContain("String");
    expect(options).toContain("Boolean");
    expect(options).toContain("Integer");
    expect(options).toContain("Decimal");
    expect(options).toContain("Date");
    expect(options).toContain("DateTime");
    expect(options).toContain("Time");
  });

  it("should have proper styling for the token", () => {
    render(<TypeToken {...mockProps} />);
    const select = screen.getByTestId("type-token");

    // Type tokens should have teal text
    expect(select).toHaveClass("text-teal-700");
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<TypeToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("String");
  });
});
