"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white border border-[#EAE3D9] p-4 sm:p-6 shadow-xl transition-all animate-in zoom-in-95 duration-200",
          className
        )}
      >
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-3 sm:pb-4 pr-8 shrink-0 min-w-0", className)}
      {...props}
    />
  );
}

export function ModalTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("font-serif text-lg sm:text-xl font-medium text-[#201C1A] tracking-tight break-words", className)}
      {...props}
    />
  );
}

export function ModalDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-[#7A746F] leading-relaxed break-words", className)}
      {...props}
    />
  );
}

export function ModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-2 min-w-0 flex-1 overflow-y-auto", className)} {...props} />;
}

export function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-4 sm:pt-5 border-t border-[#EAE3D9] shrink-0", className)}
      {...props}
    />
  );
}
