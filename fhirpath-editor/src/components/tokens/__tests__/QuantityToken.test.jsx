import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import QuantityToken from "../QuantityToken";

describe("QuantityToken", () => {
  const mockProps = {
    token: {
      type: "quantity",
      value: JSON.stringify({ value: "10", unit: "kg" }),
    },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value and unit", () => {
    render(<QuantityToken {...mockProps} />);
    const valueInput = screen.getByRole("textbox");
    const unitSelect = screen.getByRole("combobox");

    expect(valueInput).toHaveValue("10");
    expect(unitSelect).toHaveValue("kg");
  });

  it("should call onChange when value changes", () => {
    render(<QuantityToken {...mockProps} />);
    const valueInput = screen.getByRole("textbox");

    fireEvent.change(valueInput, { target: { value: "20" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "quantity",
      value: JSON.stringify({ value: "20", unit: "kg" }),
    });
  });

  it("should call onChange when unit changes", () => {
    render(<QuantityToken {...mockProps} />);
    const unitSelect = screen.getByRole("combobox");

    fireEvent.change(unitSelect, { target: { value: "g" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "quantity",
      value: JSON.stringify({ value: "10", unit: "g" }),
    });
  });

  it("should render with empty inputs when no value is provided", () => {
    render(
      <QuantityToken
        token={{ type: "quantity", value: "" }}
        onChange={mockProps.onChange}
      />
    );

    const valueInput = screen.getByRole("textbox");
    const unitSelect = screen.getByRole("combobox");

    expect(valueInput).toHaveValue("");
    expect(unitSelect).toHaveValue("");
    expect(valueInput).toHaveAttribute("data-empty");
    expect(unitSelect).toHaveAttribute("data-empty");
  });

  it("should have an option for each common unit", () => {
    render(<QuantityToken {...mockProps} />);
    const unitSelect = screen.getByRole("combobox");

    // Sample of units that should be in the dropdown
    const sampleUnits = ["kg", "g", "days", "hours", "minutes", "mmHg"];

    sampleUnits.forEach((unit) => {
      expect(screen.getByRole("option", { name: unit })).toBeInTheDocument();
    });

    // Should have blank option
    expect(screen.getByRole("option", { name: "unit" })).toBeInTheDocument();
  });

  it("should forward the ref to the value input element", () => {
    const ref = React.createRef();
    render(<QuantityToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("10");
  });

  it("should have number pattern for value input", () => {
    render(<QuantityToken {...mockProps} />);
    const valueInput = screen.getByRole("textbox");

    expect(valueInput).toHaveAttribute("pattern", "-?[0-9]*\\.?[0-9]*");
    expect(valueInput).toHaveAttribute("inputMode", "decimal");
  });
});
