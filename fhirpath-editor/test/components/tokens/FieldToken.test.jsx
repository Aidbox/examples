import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FieldToken from "@components/FieldToken.jsx";
import { ContextTypeProvider } from "@utils/react";

vi.mock(import("@utils/fhir-type.js"), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    getFields: () => ({ name: "string", id: "string", status: "string" }),
  };
});

vi.mock(import("@utils/expression.js"), async (importOriginal) => {
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

  const renderWithProvider = (ui, { providerProps, ...renderOptions } = {}) => {
    return render(
      <ContextTypeProvider {...providerProps}>{ui}</ContextTypeProvider>,
      renderOptions,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with the correct value", () => {
    renderWithProvider(<FieldToken {...mockProps} />, {
      providerProps: { value: { type: "Patient" } },
    });
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("name");
  });

  it("should render all field options in the dropdown", () => {
    renderWithProvider(<FieldToken {...mockProps} />, {
      providerProps: { value: { type: "Patient" } },
    });
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
    renderWithProvider(<FieldToken {...mockProps} />, {
      providerProps: { value: { type: "Patient" } },
    });
    const select = screen.getByRole("combobox");

    // Change selection
    fireEvent.change(select, { target: { value: "status" } });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      type: "field",
      value: "status",
    });
  });

  it("should show deleting style when deleting prop is true", () => {
    renderWithProvider(<FieldToken {...mockProps} deleting={true} />, {
      providerProps: { value: { type: "Patient" } },
    });
    const fieldContainer = screen.getByTestId("field-token");
    expect(fieldContainer).toBeInTheDocument();
  });

  it("should forward the ref to the select element", () => {
    const ref = React.createRef();
    renderWithProvider(<FieldToken {...mockProps} ref={ref} />, {
      providerProps: { value: { type: "Patient" } },
    });

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current).toHaveValue("name");
  });

  it("should show invalid field warning when field is not in available fields", () => {
    const invalidProps = {
      ...mockProps,
      token: { type: "field", value: "invalidField" },
    };
    renderWithProvider(<FieldToken {...invalidProps} />, {
      providerProps: { value: { type: "Patient" } },
    });

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveValue("invalidField");
    expect(options[0]).toBeDisabled();
  });
});
