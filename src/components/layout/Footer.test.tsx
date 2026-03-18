import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Footer from "./Footer";

describe("Footer Component", () => {
  it("renders the brand name", () => {
    render(<Footer />);
    expect(screen.getByText("Si-Imsak")).toBeInTheDocument();
  });

  it("renders the data source link with correct attributes", () => {
    render(<Footer />);
    const sourceLink = screen.getByText("Bimas Islam Kemenag RI");
    expect(sourceLink).toBeInTheDocument();
    expect(sourceLink).toHaveAttribute("href", "https://bimasislam.kemenag.go.id");
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the creator info and GitHub link with correct attributes", () => {
    render(<Footer />);
    // Since the copyright text contains dynamic parts and html entities, we can check for partial matches or use the link directly
    expect(screen.getByText(/Created by Irfan Yulianto/i)).toBeInTheDocument();

    const githubLink = screen.getByText("GitHub");
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute("href", "https://github.com/irfan-yulianto/jadwal-imsakiyah");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
