import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "ghost" | "outline" | "secondary" | "primary";
  size?: "sm" | "md" | "lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      "aria-label": ariaLabel,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] duration-150 cursor-pointer";

    const variantStyles = {
      ghost:
        "bg-transparent text-[#7A746F] hover:text-[#201C1A] hover:bg-[#F9EFE5] focus-visible:outline-[#DE4F3C]",
      outline:
        "border border-[#EAE3D9] text-[#201C1A] bg-white hover:bg-[#FAF5EE] focus-visible:outline-[#DE4F3C]",
      secondary:
        "bg-[#F9EFE5] text-[#201C1A] hover:bg-[#F2E4D5] focus-visible:outline-[#201C1A]",
      primary:
        "bg-[#DE4F3C] text-white hover:bg-[#C94230] shadow-sm focus-visible:outline-[#DE4F3C]",
    };

    const sizeStyles = {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
