import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface-2 text-fg-muted hover:bg-surface-hover hover:text-fg",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  soft: "bg-accent-soft text-accent-fg hover:bg-accent-soft-hover",
  danger: "bg-danger-soft text-danger hover:bg-danger/15",
};

const SIZES = {
  md: "min-h-11 gap-2 px-4 text-sm",
  sm: "min-h-8 gap-1.5 px-3 text-xs",
  icon: "h-11 w-11 shrink-0",
} as const;

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  type?: "button" | "submit";
  ref?: Ref<HTMLButtonElement>;
};

/** An icon-only button has no text, so it must be named */
export type ButtonProps = BaseProps & ({ size?: "md" | "sm" } | { size: "icon"; "aria-label": string });

export const buttonClass = (variant: ButtonVariant = "primary", size: keyof typeof SIZES = "md") =>
  cx(
    "focus-ring inline-flex cursor-pointer items-center justify-center rounded-control font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size]
  );

export default function Button({ variant = "primary", size = "md", type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...props} />;
}
