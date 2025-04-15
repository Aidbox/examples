import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuantityToken from "@components/QuantityToken.jsx";

describe("QuantityToken", () => {
  const mockProps = {
    token: {
      type: "quantity",
      value: { value: "10", unit: "kg" },
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
      value: { value: "20", unit: "kg" },
    });
  });

  it("should call onChange when unit changes", () => {
    render(<QuantityToken {...mockProps} />);
    const unitSelect = screen.getByRole("combobox");

    fireEvent.change(unitSelect, { target: { value: "g" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "quantity",
      value: { value: "10", unit: "g" },
    });
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
