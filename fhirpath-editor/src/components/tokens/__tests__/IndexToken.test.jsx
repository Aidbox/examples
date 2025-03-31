import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IndexToken from "../IndexToken";

describe("IndexToken", () => {
  const mockProps = {
    token: { type: "index", value: "0" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<IndexToken {...mockProps} />);
    const input = screen.getByTestId("index-token");
    expect(input).toHaveValue("0");
  });

  it("should render with brackets around the input", () => {
    render(<IndexToken {...mockProps} />);
    const brackets = screen.getAllByText(/[\[\]]/);
    expect(brackets.length).toBe(2); // One opening, one closing bracket
  });

  it("should call onChange when input value changes", () => {
    render(<IndexToken {...mockProps} />);
    const input = screen.getByTestId("index-token");

    fireEvent.change(input, { target: { value: "1" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "index",
      value: "1",
    });
  });

  it("should render with empty state when no value", () => {
    render(
      <IndexToken
        token={{ type: "index", value: "" }}
        onChange={mockProps.onChange}
      />
    );

    const input = screen.getByPlaceholderText("0");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should have a pattern attribute for numbers only", () => {
    render(<IndexToken {...mockProps} />);
    const input = screen.getByTestId("index-token");
    expect(input).toHaveAttribute("pattern", "[0-9]*");
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<IndexToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("0");
  });
});
