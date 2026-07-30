import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Ação = único botão do Tanque+ (botão ou link).
 * Toda tela deve usar este componente em vez de classes soltas.
 */
export const actionVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,background-color,color,opacity] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "border border-border bg-card text-foreground",
        soft: "bg-accent text-accent-foreground",
        inverse: "bg-primary-foreground text-primary",
        ghost: "text-primary hover:bg-accent",
        danger: "border border-border bg-card text-destructive",
        "danger-ghost": "text-destructive hover:bg-destructive/10",
      },
      size: {
        lg: "min-h-14 w-full px-5 text-base",
        md: "min-h-11 px-5 text-sm",
        sm: "min-h-11 px-3 text-sm",
        icon: "h-11 w-11 shrink-0",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

type ActionStyle = VariantProps<typeof actionVariants>;

interface CommonProps extends ActionStyle {
  children?: ReactNode;
  className?: string;
}

export function Action({
  variant,
  size,
  className,
  loading,
  children,
  disabled,
  type = "button",
  ...props
}: CommonProps & { loading?: boolean } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(actionVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ActionLink({
  variant,
  size,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(actionVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
