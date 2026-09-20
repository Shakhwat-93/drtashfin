import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
  size?: "sm" | "md";
  hasDot?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  hasDot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success:
      "bg-[#EBF5EE] text-[#1F6B38] border-[#D1EAD8] [&_.badge-dot]:bg-[#1F6B38]",
    warning:
      "bg-[#FEF7EB] text-[#975B00] border-[#FCE7BE] [&_.badge-dot]:bg-[#975B00]",
    danger:
      "bg-[#FDF0EE] text-[#B02A1A] border-[#F9D0CA] [&_.badge-dot]:bg-[#B02A1A]",
    info:
      "bg-[#EEF5FA] text-[#1D5D9B] border-[#D3E4F4] [&_.badge-dot]:bg-[#1D5D9B]",
    neutral:
      "bg-[#F9EFE5] text-[#59534E] border-[#EAE3D9] [&_.badge-dot]:bg-[#7A746F]",
    primary:
      "bg-[#FDF0EE] text-[#DE4F3C] border-[#F9D0CA] [&_.badge-dot]:bg-[#DE4F3C]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border leading-none transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {hasDot && <span className="badge-dot h-1.5 w-1.5 rounded-full" />}
      {children}
    </span>
  );
}
