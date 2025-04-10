import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Token from "@components/Token";

// Mock the token subcomponents
vi.mock("@components/tokens/NumberToken", () => ({
  default: () => <div data-testid="number-token">Number Token</div>,
}));
vi.mock("@components/tokens/StringToken", () => ({
  default: () => <div data-testid="string-token">String Token</div>,
}));
vi.mock("@components/tokens/BooleanToken", () => ({
  default: () => <div data-testid="boolean-token">Boolean Token</div>,
}));
vi.mock("@components/tokens/DateToken", () => ({
  default: () => <div data-testid="date-token">Date Token</div>,
}));
vi.mock("@components/tokens/DateTimeToken", () => ({
  default: () => <div data-testid="datetime-token">DateTime Token</div>,
}));
vi.mock("@components/tokens/TimeToken", () => ({
  default: () => <div data-testid="time-token">Time Token</div>,
}));
vi.mock("@components/tokens/QuantityToken", () => ({
  default: () => <div data-testid="quantity-token">Quantity Token</div>,
}));
vi.mock("@components/tokens/TypeToken", () => ({
  default: () => <div data-testid="type-token">Type Token</div>,
}));
vi.mock("@components/tokens/IndexToken", () => ({
  default: () => <div data-testid="index-token">Index Token</div>,
}));
vi.mock("@components/tokens/OperatorToken", () => ({
  default: () => <div data-testid="operator-token">Operator Token</div>,
}));
vi.mock("@components/tokens/VariableToken", () => ({
  default: () => <div data-testid="variable-token">Variable Token</div>,
}));
vi.mock("@components/tokens/FieldToken", () => ({
  default: () => <div data-testid="field-token">Field Token</div>,
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

  it("should render date token", () => {
    render(
      <Token {...mockProps} value={{ type: "date", value: "2023-05-15" }} />
    );
    expect(screen.getByTestId("date-token")).toBeInTheDocument();
  });

  it("should render datetime token", () => {
    render(
      <Token
        {...mockProps}
        value={{ type: "datetime", value: "2023-05-15T14:30" }}
      />
    );
    expect(screen.getByTestId("datetime-token")).toBeInTheDocument();
  });

  it("should render time token", () => {
    render(<Token {...mockProps} value={{ type: "time", value: "14:30" }} />);
    expect(screen.getByTestId("time-token")).toBeInTheDocument();
  });

  it("should render quantity token", () => {
    render(
      <Token
        {...mockProps}
        value={{
          type: "quantity",
          value: { value: "70", unit: "kg" },
        }}
      />
    );
    expect(screen.getByTestId("quantity-token")).toBeInTheDocument();
  });

  it("should render type token", () => {
    render(<Token {...mockProps} value={{ type: "type", value: "String" }} />);
    expect(screen.getByTestId("type-token")).toBeInTheDocument();
  });

  it("should render index token", () => {
    render(<Token {...mockProps} value={{ type: "index", value: "0" }} />);
    expect(screen.getByTestId("index-token")).toBeInTheDocument();
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
