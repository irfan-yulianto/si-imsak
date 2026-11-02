import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("automatically adds a title attribute for icon-only buttons using aria-label", () => {
    render(
      <Button size="icon" aria-label="Settings">
        Icon
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Settings" });
    expect(btn).toHaveAttribute("title", "Settings");
  });

  it("does not override an explicitly provided title attribute", () => {
    render(
      <Button size="icon" aria-label="Settings" title="Custom Settings">
        Icon
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Settings" });
    expect(btn).toHaveAttribute("title", "Custom Settings");
  });

  it("does not add a title attribute automatically for non-icon buttons", () => {
    render(
      <Button>
        Click Me
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Click Me" });
    expect(btn).not.toHaveAttribute("title");
  });
});
