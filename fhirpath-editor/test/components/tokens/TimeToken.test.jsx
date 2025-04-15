import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TimeToken from "@components/TimeToken.jsx";

describe("TimeToken", () => {
  const mockProps = {
    token: { type: "time", value: "14:30" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<TimeToken {...mockProps} />);
    const input = screen.getByTestId("time-token");
    expect(input).toHaveValue("14:30");
  });

  it("should call onChange when time value changes", () => {
    render(<TimeToken {...mockProps} />);
    const input = screen.getByTestId("time-token");

    fireEvent.change(input, { target: { value: "09:15" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "time",
      value: "09:15",
    });
  });

  it("should have time input type", () => {
    render(<TimeToken {...mockProps} />);
    const input = screen.getByTestId("time-token");
    expect(input).toHaveAttribute("type", "time");
  });

  it("should render with empty state when no value", () => {
    render(
      <TimeToken
        token={{ type: "time", value: "" }}
        onChange={mockProps.onChange}
      />,
    );

    const input = screen.getByTestId("time-token");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("data-empty");
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<TimeToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("14:30");
  });
});
