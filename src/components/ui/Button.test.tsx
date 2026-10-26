import { render, screen } from "@testing-library/react";
import Button from "./Button";
import { describe, it, expect } from "vitest";

describe("Button", () => {
  it("provides a native tooltip matching its aria-label for icon buttons", () => {
    render(<Button size="icon" aria-label="Test Icon Button" />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Test Icon Button");
  });

  it("allows explicitly passed title to override the generated fallback", () => {
    render(<Button size="icon" aria-label="Test Icon Button" title="Explicit Title" />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Explicit Title");
  });
});
