import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "default" | "wide" | "full";
}

export function PageContainer({
  maxWidth = "default",
  className,
  children,
  ...props
}: PageContainerProps) {
  const maxWidthStyles = {
    default: "max-w-7xl",
    wide: "max-w-8xl",
    full: "max-w-none",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8",
        maxWidthStyles[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
