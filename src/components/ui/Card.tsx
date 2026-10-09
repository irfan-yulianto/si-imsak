import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** The surface every panel of the page sits on */
export default function Card({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }) {
  return <Tag className={cx("rounded-card border border-border bg-surface shadow-card", className)} {...props} />;
}
