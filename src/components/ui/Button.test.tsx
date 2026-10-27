import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Button from "./Button";

test("Button forwards aria-label as native tooltip title for icon buttons", () => {
  render(
    <Button size="icon" aria-label="Pengaturan">
      Icon
    </Button>
  );

  const button = screen.getByRole("button", { name: "Pengaturan" });
  expect(button).toHaveAttribute("title", "Pengaturan");
});

test("Button allows explicit title to override fallback", () => {
  render(
    <Button size="icon" aria-label="Pengaturan" title="Setelan">
      Icon
    </Button>
  );

  const button = screen.getByRole("button", { name: "Pengaturan" });
  expect(button).toHaveAttribute("title", "Setelan");
});
