import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import BindingMenu from "@components/BindingMenu.jsx";

describe("BindingMenu", () => {
  it("should render with default props", () => {
    const { container } = render(
      <BindingMenu attributes={{}} listeners={{}} />,
    );
    const handle = container.querySelector("button");
    expect(handle).toBeInTheDocument();
    expect(handle).not.toHaveAttribute("data-active");
    expect(handle).not.toHaveAttribute("data-invalid");
  });

  it("should render with active state", () => {
    const { container } = render(
      <BindingMenu
        attributes={{}}
        listeners={{}}
        active={{ id: "test", data: {} }}
      />,
    );
    const handle = container.querySelector("button");
    expect(handle).toHaveAttribute("data-active");
  });

  it("should render with invalid state", () => {
    const { container } = render(
      <BindingMenu attributes={{}} listeners={{}} valid={false} />,
    );
    const handle = container.querySelector("button");
    expect(handle).toHaveAttribute("data-invalid");
  });
});
