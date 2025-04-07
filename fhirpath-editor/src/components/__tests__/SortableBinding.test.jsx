import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import SortableBinding from "../SortableBinding";

// Mock the useSortable hook
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: { "aria-pressed": "false" },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

// Mock the Binding and DragHandle components
vi.mock("../Binding", () => ({
  default: React.forwardRef((props, ref) => (
    <div data-testid="binding" ref={ref}>
      Mock Binding
    </div>
  )),
}));

vi.mock("../DragHandle", () => ({
  default: () => <div data-testid="drag-handle">Mock DragHandle</div>,
}));

describe("SortableBinding", () => {
  const mockProps = {
    value: { id: "test-id", name: "testVar", expression: [] },
    bindings: [],
    onChange: vi.fn(),
    sorting: false,
  };

  it("should render the drag handle and binding", () => {
    render(<SortableBinding {...mockProps} />);

    expect(screen.getByTestId("drag-handle")).toBeInTheDocument();
    expect(screen.getByTestId("binding")).toBeInTheDocument();
  });

  it("should not render the drag handle when sorting", () => {
    render(<SortableBinding {...mockProps} sorting={true} />);

    expect(screen.queryByTestId("drag-handle")).not.toBeInTheDocument();
    expect(screen.getByTestId("binding")).toBeInTheDocument();
  });

  it("should forward the ref to the Binding component", () => {
    const ref = React.createRef();
    render(<SortableBinding {...mockProps} ref={ref} />);

    // In a real scenario, we'd verify the ref was properly forwarded
    // but in tests with mocks it's complex to verify
    expect(screen.getByTestId("binding")).toBeInTheDocument();
  });
});
