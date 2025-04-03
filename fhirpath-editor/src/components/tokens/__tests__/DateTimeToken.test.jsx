import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DateTimeToken from "../DateTimeToken";

describe("DateTimeToken", () => {
  const mockProps = {
    token: { type: "datetime", value: "2023-05-15T14:30" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<DateTimeToken {...mockProps} />);
    const input = screen.getByTestId("datetime-token");
    expect(input).toHaveValue("2023-05-15T14:30");
  });

  it("should call onChange when datetime value changes", () => {
    render(<DateTimeToken {...mockProps} />);
    const input = screen.getByTestId("datetime-token");

    fireEvent.change(input, { target: { value: "2024-01-20T09:15" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "datetime",
      value: "2024-01-20T09:15",
    });
  });

  it("should have datetime-local input type", () => {
    render(<DateTimeToken {...mockProps} />);
    const input = screen.getByTestId("datetime-token");
    expect(input).toHaveAttribute("type", "datetime-local");
  });

  it("should render with empty state when no value", () => {
    render(
      <DateTimeToken
        token={{ type: "datetime", value: "" }}
        onChange={mockProps.onChange}
      />,
    );

    const input = screen.getByTestId("datetime-token");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<DateTimeToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("2023-05-15T14:30");
  });
});
