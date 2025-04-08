import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OperatorToken from "@components/tokens/OperatorToken";

describe("OperatorToken", () => {
  const mockProps = {
    token: { type: "operator", value: "+" },
    onChange: vi.fn(),
    bindings: [],
    expression: [{ type: "number", value: "5" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<OperatorToken {...mockProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("+");
  });

  it("should render all operator options in the dropdown", () => {
    render(<OperatorToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Open dropdown
    fireEvent.focus(select);

    // Should have options for each operator
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveValue("+");
    expect(options[1]).toHaveValue("-");
    expect(options[2]).toHaveValue("*");
    expect(options[3]).toHaveValue("/");
  });

  it("should call onChange when selection changes", () => {
    render(<OperatorToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "-" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "operator",
      value: "-",
    });
  });

  it("should have proper styling for the token", () => {
    render(<OperatorToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Operator tokens typically have special styling
    expect(select).toHaveClass("text-yellow-800");
  });

  it("should apply focus styling", () => {
    render(<OperatorToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    fireEvent.focus(select);
    expect(select).toHaveClass("focus:outline-none");
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<OperatorToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("+");
  });
});
