import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NumberToken from "@components/NumberToken.jsx";

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
      />,
    );

    const input = screen.getByPlaceholderText("0");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should have integer formatting for whole numbers", () => {
    render(<NumberToken {...mockProps} />);
    const input = screen.getByTestId("number-token");
    expect(input).toHaveClass("text-blue-800");
    expect(input).toHaveAttribute("placeholder", "0");
  });

  it("should have decimal formatting for numbers with decimal points", () => {
    render(
      <NumberToken
        token={{ type: "number", value: "3.14" }}
        onChange={mockProps.onChange}
      />,
    );
    const input = screen.getByTestId("number-token");
    expect(input).toHaveClass("text-indigo-800");
  });

  it("should have pattern attribute for numbers", () => {
    render(<NumberToken {...mockProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("pattern", "-?[0-9]*\\.?[0-9]*");
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<NumberToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("42");
  });
});
