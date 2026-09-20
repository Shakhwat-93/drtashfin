"use client";

import * as React from "react";
import { Search, Bell, Menu, ChevronDown, User, ShieldCheck } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";

export interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#EAE3D9] bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
      {/* Left: Mobile Trigger & Contextual Date */}
      <div className="flex items-center gap-3">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="lg:hidden text-[#201C1A]"
        >
          <Menu className="h-5 w-5" />
        </IconButton>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#7A746F]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{currentDate}</span>
          <span className="text-[#EAE3D9]">•</span>
          <span>Main Chamber</span>
        </div>
      </div>

      {/* Center/Left: Global Patient Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7A746F]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            readOnly
            placeholder="Search patients..."
            className="w-full h-9 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/70 pl-9 pr-4 text-xs text-[#201C1A] placeholder:text-[#7A746F] focus:outline-hidden focus:border-[#DE4F3C] focus:bg-white transition-all cursor-text"
          />
          <div className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-[#EAE3D9] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right: Notifications & Doctor Profile */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="View notifications"
            className="text-[#7A746F] hover:text-[#201C1A]"
          >
            <Bell className="h-4 w-4" />
          </IconButton>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#DE4F3C] ring-2 ring-white" />
        </div>

        <div className="h-5 w-[1px] bg-[#EAE3D9] mx-0.5 hidden sm:block" />

        {/* Doctor Profile Placeholder */}
        <Dropdown>
          <DropdownTrigger>
            <div className="flex items-center gap-2.5 pl-1.5 py-1 pr-2 rounded-lg hover:bg-[#FAF5EE] transition-colors border border-transparent hover:border-[#EAE3D9]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9EFE5] border border-[#EAE3D9] text-[#DE4F3C] font-serif font-semibold text-xs">
                DT
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#201C1A] leading-tight">
                  Dr. Tashfin
                </span>
                <span className="text-[10px] text-[#7A746F]">
                  Cardiology & Medicine
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#7A746F] hidden md:block" />
            </div>
          </DropdownTrigger>
          <DropdownContent align="right" className="w-56">
            <div className="px-3 py-2 border-b border-[#EAE3D9]">
              <p className="text-xs font-semibold text-[#201C1A]">Dr. Tashfin</p>
              <p className="text-[10px] text-[#7A746F]">doctor@clinic.local</p>
            </div>
            <DropdownItem>
              <User className="h-3.5 w-3.5 text-[#7A746F]" />
              Doctor Profile
            </DropdownItem>
            <DropdownItem>
              <ShieldCheck className="h-3.5 w-3.5 text-[#7A746F]" />
              Clinic Preferences
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
