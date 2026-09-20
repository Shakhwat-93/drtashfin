import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isError = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-[80px] px-3.5 py-2.5 text-sm bg-white text-[#201C1A] placeholder:text-[#7A746F]/70 border border-[#EAE3D9] rounded-lg transition-all duration-150 shadow-xs resize-y",
          "focus:outline-hidden focus:border-[#DE4F3C] focus:ring-2 focus:ring-[#DE4F3C]/15",
          "disabled:bg-[#FAF5EE] disabled:text-[#7A746F] disabled:cursor-not-allowed",
          isError && "border-[#F9D0CA] bg-[#FDF0EE]/30 focus:border-[#B02A1A] focus:ring-[#B02A1A]/15 text-[#B02A1A]",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
