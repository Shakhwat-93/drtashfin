import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  label,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-[#EAE3D9]/60",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        {label && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A746F]">
            {label}
          </p>
        )}
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#201C1A]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[#7A746F] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
