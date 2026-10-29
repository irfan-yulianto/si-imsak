import { render } from "@testing-library/react";
import Button from "./Button";

test("adds default title for icon button if aria-label is present", () => {
  const { getByRole } = render(<Button size="icon" aria-label="Test Label">Icon</Button>);
  const button = getByRole("button");
  expect(button).toHaveAttribute("title", "Test Label");
});

test("does not add title for non-icon button", () => {
  const { getByRole } = render(<Button aria-label="Test Label">Text</Button>);
  const button = getByRole("button");
  expect(button).not.toHaveAttribute("title");
});

test("does not override explicit title", () => {
  const { getByRole } = render(<Button size="icon" aria-label="Test Label" title="Explicit Title">Icon</Button>);
  const button = getByRole("button");
  expect(button).toHaveAttribute("title", "Explicit Title");
});
