import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#EAE3D9] bg-[#FAF5EE]/50",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F9EFE5] border border-[#EAE3D9] text-[#7A746F] mb-3">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h4 className="font-serif text-base font-medium text-[#201C1A]">
        {title}
      </h4>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[#7A746F] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
