import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import BindingMenu from "../BindingMenu.jsx";

describe("DragHandle", () => {
  const mockListeners = { onMouseDown: vi.fn() };
  const mockAttributes = { "aria-pressed": "false" };

  it("should render with default props", () => {
    const { container } = render(
      <BindingMenu attributes={mockAttributes} listeners={mockListeners} />,
    );
    const handle = container.querySelector("div");
    expect(handle).toBeInTheDocument();
    expect(handle).not.toHaveAttribute("data-active");
    expect(handle).not.toHaveAttribute("data-invalid");
  });

  it("should render with active state", () => {
    const { container } = render(
      <BindingMenu
        attributes={mockAttributes}
        listeners={mockListeners}
        active={true}
      />,
    );
    const handle = container.querySelector("div");
    expect(handle).toHaveAttribute("data-active");
  });

  it("should render with invalid state", () => {
    const { container } = render(
      <BindingMenu
        attributes={mockAttributes}
        listeners={mockListeners}
        valid={false}
      />,
    );
    const handle = container.querySelector("div");
    expect(handle).toHaveAttribute("data-invalid");
  });
});
