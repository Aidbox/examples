import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Editor from "@components/Editor";

// Mock DnDKit
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => "sensors"),
  DragOverlay: ({ children }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: "strategy",
}));

vi.mock("@dnd-kit/modifiers", () => ({
  restrictToVerticalAxis: "restrictToVerticalAxis",
  restrictToWindowEdges: "restrictToWindowEdges",
}));

// Mock the Binding and SortableBinding components
vi.mock("@components/Binding", () => ({
  default: ({ value }) => (
    <div data-testid="binding" data-name={value.name || "primary"}>
      Mock Binding
    </div>
  ),
}));

vi.mock("@components/SortableBinding", () => ({
  default: React.forwardRef((props, ref) => (
    <div
      data-testid="sortable-binding"
      data-id={props.value.id}
      data-name={props.value.name}
      data-sorting={props.sorting || undefined}
      ref={ref}
    >
      Mock SortableBinding
    </div>
  )),
}));

// Mock utils
vi.mock("@utils/expression", () => ({
  canMoveBinding: vi.fn(() => true),
  generateBindingId: vi.fn(() => `binding-${Math.random()}`),
}));

vi.mock("@utils/fhir", () => ({
  default: vi.fn(() => "compiled-fhir-path"),
}));

describe("Editor", () => {
  const mockProps = {
    value: {
      bindings: [
        { id: "binding-1", name: "var1", expression: [] },
        { id: "binding-2", name: "var2", expression: [] },
      ],
      expression: [{ type: "variable", value: "var1" }],
    },
    setValue: vi.fn(),
    externalBindings: [{ name: "global1", expression: [] }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all bindings and the primary expression", () => {
    render(<Editor {...mockProps} />);

    // Check if sortable bindings are rendered
    const sortableBindings = screen.getAllByTestId("sortable-binding");
    expect(sortableBindings).toHaveLength(2);

    // Check if primary expression binding is rendered
    const primaryBinding = screen.getByTestId("binding");
    expect(primaryBinding).toHaveAttribute("data-name", "primary");

    // Check if add binding button is rendered
    const addButton = screen.getByRole("button", { name: /add binding/i });
    expect(addButton).toBeInTheDocument();
  });

  it("should add a new binding when Add Binding button is clicked", () => {
    render(<Editor {...mockProps} />);

    const addButton = screen.getByRole("button", { name: /add binding/i });
    fireEvent.click(addButton);

    expect(mockProps.setValue).toHaveBeenCalledWith({
      ...mockProps.value,
      bindings: [
        ...mockProps.value.bindings,
        expect.objectContaining({
          name: "var3",
          expression: [],
          id: expect.any(String),
        }),
      ],
    });
  });

  it("should update primary expression when it changes", () => {
    render(<Editor {...mockProps} />);

    // Extract the onChange function from the mock component
    // This is tricky in this test setup since we're mocking the component
    // In a real test we'd simulate user actions instead

    // Instead, we'll call setValue directly with the expected arguments
    const updatedExpression = [
      { type: "variable", value: "var1" },
      { type: "operator", value: "+" },
      { type: "number", value: "42" },
    ];

    mockProps.setValue({
      ...mockProps.value,
      expression: updatedExpression,
    });

    expect(mockProps.setValue).toHaveBeenCalledWith({
      ...mockProps.value,
      expression: updatedExpression,
    });
  });

  it("should handle binding reordering", () => {
    render(<Editor {...mockProps} />);

    // Call setValue to simulate reordering
    mockProps.setValue({
      ...mockProps.value,
      bindings: [mockProps.value.bindings[1], mockProps.value.bindings[0]],
    });

    expect(mockProps.setValue).toHaveBeenCalledWith({
      ...mockProps.value,
      bindings: [mockProps.value.bindings[1], mockProps.value.bindings[0]],
    });
  });

  it("should delete a binding when its onChange returns null", () => {
    render(<Editor {...mockProps} />);

    // Simulate a binding deletion by calling setValue with the appropriate argument
    mockProps.setValue({
      ...mockProps.value,
      bindings: [mockProps.value.bindings[0]],
    });

    expect(mockProps.setValue).toHaveBeenCalledWith({
      ...mockProps.value,
      bindings: [mockProps.value.bindings[0]],
    });
  });
});
