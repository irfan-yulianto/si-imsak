import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("adds title attribute matching aria-label for icon buttons", () => {
    const { getByLabelText } = render(<Button size="icon" aria-label="Icon Label">Icon</Button>);
    expect(getByLabelText("Icon Label")).toHaveAttribute("title", "Icon Label");
  });

  it("allows overriding title attribute", () => {
    const { getByLabelText } = render(<Button size="icon" aria-label="Icon Label" title="Custom Title">Icon</Button>);
    expect(getByLabelText("Icon Label")).toHaveAttribute("title", "Custom Title");
  });
});
