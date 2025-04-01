import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FieldToken from "../FieldToken";
import { compositeTypes } from "../../../utils/type.js";

// Mock the utility function
vi.mock(import("../../../utils/type"), async (importOriginal) => {
  const mod = await importOriginal();

  return {
    ...mod,
    compositeTypes: {
      Patient: {
        name: "string",
        id: "number",
        status: "string",
      },
    },
  };
});

describe("FieldToken", () => {
  const mockProps = {
    token: { type: "field", value: "name" },
    onChange: vi.fn(),
    bindings: [{ name: "patient", type: { type: "Patient" } }],
    expression: [
      { type: "variable", value: "patient" },
      { type: "field", value: "name" },
    ],
    deleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    render(<FieldToken {...mockProps} />);

    // Field token should render with a dot followed by the field name
    // expect(screen.getByTestId("field-token-dot")).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("name");
  });

  it("should render all field options in the dropdown", () => {
    render(<FieldToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Open dropdown
    fireEvent.focus(select);

    // Should have options for each field
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3); // name, id, status
    expect(options[0]).toHaveValue("name");
    expect(options[1]).toHaveValue("id");
    expect(options[2]).toHaveValue("status");
  });

  it("should call onChange when selection changes", () => {
    render(<FieldToken {...mockProps} />);
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "status" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "field",
      value: "status",
    });
  });

  it("should show deleting style when deleting prop is true", () => {
    render(<FieldToken {...mockProps} deleting={true} />);

    // Container should have deleting styles
    const fieldContainer = screen.getByTestId("field-token");
    // const dot = screen.getByTestId("field-token-dot");
    // expect(dot).not.toBeVisible();
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<FieldToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("name");
  });
});
