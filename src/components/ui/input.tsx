import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", isError = false, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[#7A746F]">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full h-10 px-3.5 py-2 text-sm bg-white text-[#201C1A] placeholder:text-[#7A746F]/70 border border-[#EAE3D9] rounded-lg transition-all duration-150 shadow-xs",
            "focus:outline-hidden focus:border-[#DE4F3C] focus:ring-2 focus:ring-[#DE4F3C]/15",
            "disabled:bg-[#FAF5EE] disabled:text-[#7A746F] disabled:cursor-not-allowed",
            isError && "border-[#F9D0CA] bg-[#FDF0EE]/30 focus:border-[#B02A1A] focus:ring-[#B02A1A]/15 text-[#B02A1A]",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-[#7A746F]">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
