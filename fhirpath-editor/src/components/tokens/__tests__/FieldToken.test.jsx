import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FieldToken from "../FieldToken";

vi.mock(import("../../../utils/fhir-type.js"), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    getFields: () => ({ name: "string", id: "string", status: "string" }),
  };
});

vi.mock(import("../../../utils/expression.js"), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    getExpressionType: () => "Patient",
  };
});

describe("FieldToken", () => {
  const mockProps = {
    token: { type: "field", value: "name" },
    onChange: vi.fn(),
    bindings: [],
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
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("name");
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
    const fieldContainer = screen.getByTestId("field-token");
    expect(fieldContainer).toBeInTheDocument();
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    render(<FieldToken {...mockProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("name");
  });

  it("should show invalid field warning when field is not in available fields", () => {
    const invalidProps = {
      ...mockProps,
      token: { type: "field", value: "invalidField" },
    };
    render(<FieldToken {...invalidProps} />);

    const select = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveValue("invalidField");
    expect(options[0]).toBeDisabled();
  });
});
