"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(
  undefined
);

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownTrigger must be used within Dropdown");

  return (
    <div
      onClick={() => context.setIsOpen((prev) => !prev)}
      aria-expanded={context.isOpen}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}

export interface DropdownContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right";
}

export function DropdownContent({
  align = "right",
  className,
  children,
  ...props
}: DropdownContentProps) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownContent must be used within Dropdown");

  if (!context.isOpen) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 min-w-[180px] rounded-xl border border-[#EAE3D9] bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150",
        align === "right" ? "right-0" : "left-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DropdownItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export const DropdownItem = React.forwardRef<
  HTMLButtonElement,
  DropdownItemProps
>(({ className, destructive = false, onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    context?.setIsOpen(false);
  };

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer",
        destructive
          ? "text-[#B02A1A] hover:bg-[#FDF0EE]"
          : "text-[#201C1A] hover:bg-[#FAF5EE]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownItem.displayName = "DropdownItem";

export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-[1px] bg-[#EAE3D9]", className)} />;
}
