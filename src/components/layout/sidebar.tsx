"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVIGATION_SECTIONS, type NavigationItem } from "@/config/navigation";

export interface SidebarProps {
  onItemClick?: () => void;
  className?: string;
}

export function Sidebar({ onItemClick, className }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (item: NavigationItem) => {
    if (item.exact || item.href === "/") {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-white border-r border-[#EAE3D9] select-none",
        className
      )}
    >
      {/* Clinic Brand / Header */}
      <div className="flex h-16 items-center px-6 border-b border-[#EAE3D9]/70">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          onClick={onItemClick}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DE4F3C] text-white shadow-xs">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base font-semibold text-[#201C1A] leading-tight">
              Dr. Tashfin
            </span>
            <span className="text-[11px] font-medium tracking-wide text-[#7A746F]">
              Patient Care System
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7A746F]">
              {section.title}
            </div>
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors duration-150",
                      active
                        ? "bg-[#DE4F3C] text-white shadow-xs font-semibold"
                        : "text-[#201C1A] hover:bg-[#F9EFE5] hover:text-[#201C1A]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-white" : "text-[#7A746F] group-hover:text-[#201C1A]"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Sidebar Footer Clinic Status */}
      <div className="p-3.5 border-t border-[#EAE3D9]/70">
        <div className="flex items-center gap-3 rounded-xl bg-[#FAF5EE] p-3 border border-[#EAE3D9]/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[#201C1A] truncate">
              Private Practice
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Clinic Operational
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
