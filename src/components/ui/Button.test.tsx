import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button";

describe("Button component", () => {
  it("renders with a fallback title when disabled and has aria-label", () => {
    render(<Button disabled aria-label="Test Label" size="icon" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Test Label");
  });

  it("renders with a fallback title when disabled and has string children", () => {
    render(<Button disabled>Test Text</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Test Text");
  });

  it("passes through provided title whether enabled or disabled", () => {
    render(<Button title="Explicit Title">Enabled</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Explicit Title");

    render(<Button disabled title="Explicit Disabled Title">Disabled</Button>);
    expect(screen.getAllByRole("button")[1]).toHaveAttribute("title", "Explicit Disabled Title");
  });

  it("intercepts click when disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click Me</Button>);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
