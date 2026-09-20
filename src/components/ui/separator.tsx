import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      role = decorative ? "none" : "separator",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role={role}
        aria-orientation={role === "separator" ? orientation : undefined}
        className={cn(
          "shrink-0 bg-[#EAE3D9]",
          orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";
