import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DateToken from "../DateToken";

describe("DateToken", () => {
  const mockProps = {
    token: { type: "date", value: "2023-05-15" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<DateToken {...mockProps} />);
    const input = screen.getByTestId("date-token");
    expect(input).toHaveValue("2023-05-15");
  });

  it("should call onChange when date value changes", () => {
    render(<DateToken {...mockProps} />);
    const input = screen.getByTestId("date-token");

    fireEvent.change(input, { target: { value: "2024-01-20" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "date",
      value: "2024-01-20",
    });
  });

  it("should have date input type", () => {
    render(<DateToken {...mockProps} />);
    const input = screen.getByTestId("date-token");
    expect(input).toHaveAttribute("type", "date");
  });

  it("should render with empty state when no value", () => {
    render(
      <DateToken
        token={{ type: "date", value: "" }}
        onChange={mockProps.onChange}
      />,
    );

    const input = screen.getByTestId("date-token");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<DateToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("2023-05-15");
  });
});
