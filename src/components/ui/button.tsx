import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-clay-600 text-white hover:bg-clay-700 active:bg-clay-800 shadow-sm",
  secondary: "bg-stone-900 text-white hover:bg-stone-800 active:bg-black shadow-sm",
  ghost: "bg-transparent text-stone-700 hover:bg-stone-100 border border-stone-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  asChild,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);

  if (asChild) {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
