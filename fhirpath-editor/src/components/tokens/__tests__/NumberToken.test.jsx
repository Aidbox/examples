import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NumberToken from "../NumberToken";

describe("NumberToken", () => {
  const mockProps = {
    token: { type: "number", value: "42" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<NumberToken {...mockProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("42");
  });

  it("should call onChange when input value changes", () => {
    render(<NumberToken {...mockProps} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "123" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "number",
      value: "123",
    });
  });

  it("should render with empty placeholder when no value", () => {
    render(
      <NumberToken
        token={{ type: "number", value: "" }}
        onChange={mockProps.onChange}
      />
    );

    const input = screen.getByPlaceholderText("0");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should accept any input including non-numeric characters", () => {
    // The component doesn't validate input - that's handled at a higher level
    render(<NumberToken {...mockProps} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "abc" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "number",
      value: "abc",
    });
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<NumberToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("42");
  });
});
