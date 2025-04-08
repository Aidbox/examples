import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BooleanToken from "@components/tokens/BooleanToken";

describe("BooleanToken", () => {
  const mockProps = {
    token: { type: "boolean", value: "true" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<BooleanToken {...mockProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("true");
  });

  it("should call onChange when selection changes", () => {
    render(<BooleanToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "false" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "boolean",
      value: "false",
    });
  });

  it("should render with true as default when no value provided", () => {
    render(
      <BooleanToken
        token={{ type: "boolean" }}
        onChange={mockProps.onChange}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("true");
  });

  it("should have proper styling for the token", () => {
    render(<BooleanToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Boolean tokens should have green text
    expect(select).toHaveClass("text-green-800");
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<BooleanToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("true");
  });
});
