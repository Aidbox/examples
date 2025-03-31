import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Token from "../Token";

// Mock the token subcomponents
vi.mock("../tokens/NumberToken", () => ({
  default: ({ token, onChange, ref }) => (
    <div data-testid="number-token">Number Token</div>
  ),
}));
vi.mock("../tokens/StringToken", () => ({
  default: ({ token, onChange, ref }) => (
    <div data-testid="string-token">String Token</div>
  ),
}));
vi.mock("../tokens/BooleanToken", () => ({
  default: ({ token, onChange, ref }) => (
    <div data-testid="boolean-token">Boolean Token</div>
  ),
}));
vi.mock("../tokens/OperatorToken", () => ({
  default: ({ token, onChange, expression, bindings, ref }) => (
    <div data-testid="operator-token">Operator Token</div>
  ),
}));
vi.mock("../tokens/VariableToken", () => ({
  default: ({ token, onChange, bindings, expression, ref }) => (
    <div data-testid="variable-token">Variable Token</div>
  ),
}));
vi.mock("../tokens/FieldToken", () => ({
  default: ({ token, onChange, bindings, expression, deleting, ref }) => (
    <div data-testid="field-token">Field Token</div>
  ),
}));

describe("Token", () => {
  const mockProps = {
    onChange: vi.fn(),
    bindings: [],
    expression: [],
    index: 0,
    deleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render number token", () => {
    render(<Token {...mockProps} value={{ type: "number", value: "42" }} />);
    expect(screen.getByTestId("number-token")).toBeInTheDocument();
  });

  it("should render string token", () => {
    render(<Token {...mockProps} value={{ type: "string", value: "test" }} />);
    expect(screen.getByTestId("string-token")).toBeInTheDocument();
  });

  it("should render boolean token", () => {
    render(<Token {...mockProps} value={{ type: "boolean", value: "true" }} />);
    expect(screen.getByTestId("boolean-token")).toBeInTheDocument();
  });

  it("should render operator token", () => {
    render(<Token {...mockProps} value={{ type: "operator", value: "+" }} />);
    expect(screen.getByTestId("operator-token")).toBeInTheDocument();
  });

  it("should render variable token", () => {
    render(
      <Token {...mockProps} value={{ type: "variable", value: "var1" }} />
    );
    expect(screen.getByTestId("variable-token")).toBeInTheDocument();
  });

  it("should render field token", () => {
    render(<Token {...mockProps} value={{ type: "field", value: "field1" }} />);
    expect(screen.getByTestId("field-token")).toBeInTheDocument();
  });

  it("should show error for unknown token type", () => {
    render(<Token {...mockProps} value={{ type: "unknown", value: "test" }} />);
    expect(screen.getByText("⚠️ unknown token type")).toBeInTheDocument();
  });

  it("should apply deleting style when deleting is true", () => {
    render(
      <Token
        {...mockProps}
        value={{ type: "number", value: "42" }}
        deleting={true}
      />
    );
    const container = screen.getByTestId("number-token").parentElement;
    expect(container).toHaveClass("bg-red-500");
  });
});
