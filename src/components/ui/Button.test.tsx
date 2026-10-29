import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Button from "./Button";

describe("Button component", () => {
  it("renders with a fallback title when aria-label is provided for icon-only buttons", () => {
    render(
      <Button size="icon" aria-label="Icon label">
        <span>icon</span>
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Icon label" });
    expect(btn).toHaveAttribute("title", "Icon label");
  });

  it("allows explicit title to override the fallback title", () => {
    render(
      <Button size="icon" aria-label="Icon label" title="Custom title">
        <span>icon</span>
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Icon label" });
    expect(btn).toHaveAttribute("title", "Custom title");
  });

  it("does not render title if aria-label is not provided", () => {
    render(<Button size="md">Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).not.toHaveAttribute("title");
  });
});
