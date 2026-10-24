import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("handles disabled state via aria-disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("adds a default title to disabled icon buttons based on aria-label", () => {
    render(<Button size="icon" aria-label="Icon Btn" disabled>Icon</Button>);
    const btn = screen.getByRole("button", { name: "Icon Btn" });
    expect(btn).toHaveAttribute("title", "Icon Btn");
  });
});
