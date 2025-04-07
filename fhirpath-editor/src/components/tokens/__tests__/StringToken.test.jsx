import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StringToken from "../StringToken";

describe("StringToken", () => {
  const mockProps = {
    token: { type: "string", value: "test" },
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<StringToken {...mockProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("test");
  });

  it("should show quote marks around the text", () => {
    render(<StringToken {...mockProps} />);
    const quoteMarks = screen.getAllByText('"');
    expect(quoteMarks.length).toBe(2);
    // Should show quotes at beginning and end
  });

  it("should call onChange when the value changes", async () => {
    const user = userEvent.setup();
    render(<StringToken {...mockProps} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "hello world");

    // Check that onChange was called with any object containing type: "string"
    expect(mockProps.onChange).toHaveBeenCalled();
    const lastCall =
      mockProps.onChange.mock.calls[
        mockProps.onChange.mock.calls.length - 1
      ][0];
    expect(lastCall.type).toBe("string");
  });

  it("should render with empty string", () => {
    render(
      <StringToken
        token={{ type: "string", value: "" }}
        onChange={mockProps.onChange}
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
    // Should still show the quote marks
    expect(screen.getAllByText('"').length).toBe(2);
  });

  it("should forward the ref to the input element", () => {
    const ref = React.createRef();
    render(<StringToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveValue("test");
  });
});
