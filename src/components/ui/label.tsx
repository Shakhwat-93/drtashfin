import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  isRequired?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, isRequired = false, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-xs font-medium uppercase tracking-wider text-[#7A746F] select-none",
          className
        )}
        {...props}
      >
        {children}
        {isRequired && <span className="ml-1 text-[#DE4F3C]">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";
