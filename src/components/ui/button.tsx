import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] duration-150 select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-[#DE4F3C] text-white hover:bg-[#C94230] active:bg-[#B83A2A] shadow-sm focus-visible:outline-[#DE4F3C]",
      secondary:
        "bg-[#F9EFE5] text-[#201C1A] hover:bg-[#F2E4D5] border border-[#EAE3D9] focus-visible:outline-[#201C1A]",
      outline:
        "bg-transparent border border-[#EAE3D9] text-[#201C1A] hover:bg-[#F9EFE5] focus-visible:outline-[#DE4F3C]",
      ghost:
        "bg-transparent text-[#201C1A] hover:bg-[#F9EFE5] focus-visible:outline-[#DE4F3C]",
      danger:
        "bg-[#FDF0EE] text-[#B02A1A] border border-[#F9D0CA] hover:bg-[#FBDFDC] focus-visible:outline-[#B02A1A]",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5 h-8",
      md: "text-sm px-4 py-2 gap-2 h-10",
      lg: "text-base px-5 py-2.5 gap-2.5 h-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
