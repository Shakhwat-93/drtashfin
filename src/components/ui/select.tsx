import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, isError = false, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "w-full h-10 pl-3.5 pr-9 py-2 text-sm bg-white text-[#201C1A] border border-[#EAE3D9] rounded-lg transition-all duration-150 shadow-xs appearance-none cursor-pointer",
            "focus:outline-hidden focus:border-[#DE4F3C] focus:ring-2 focus:ring-[#DE4F3C]/15",
            "disabled:bg-[#FAF5EE] disabled:text-[#7A746F] disabled:cursor-not-allowed",
            isError && "border-[#F9D0CA] bg-[#FDF0EE]/30 focus:border-[#B02A1A] focus:ring-[#B02A1A]/15 text-[#B02A1A]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A746F]">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
