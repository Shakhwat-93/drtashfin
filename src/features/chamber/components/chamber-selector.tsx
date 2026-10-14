"use client";

import * as React from "react";
import { MapPin, ChevronDown, Check, Loader2, Building2 } from "lucide-react";
import { useChamber } from "../context/chamber-context";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";

export interface ChamberSelectorProps {
  className?: string;
  variant?: "header" | "card" | "compact";
}

export function ChamberSelector({
  className = "",
  variant = "header",
}: ChamberSelectorProps) {
  const { activeChamber, chambers, isSwitching, switchChamber } = useChamber();

  const getPrefixColor = (prefix: string) => {
    switch (prefix) {
      case "DH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "RNG":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "N":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  if (variant === "compact") {
    return (
      <Dropdown>
        <DropdownTrigger>
          <button
            type="button"
            disabled={isSwitching}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#EAE3D9] bg-white hover:bg-[#FAF5EE] transition-all text-xs font-medium text-[#201C1A] disabled:opacity-60 ${className}`}
          >
            {isSwitching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DE4F3C]" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-[#DE4F3C]" />
            )}
            <span className="truncate max-w-[120px]">{activeChamber.name}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${getPrefixColor(
                activeChamber.patientIdPrefix
              )}`}
            >
              {activeChamber.patientIdPrefix}
            </span>
            <ChevronDown className="h-3 w-3 text-[#7A746F] shrink-0" />
          </button>
        </DropdownTrigger>
        <DropdownContent align="right" className="w-64 p-1">
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#EAE3D9]/60">
            Switch Practice Chamber
          </div>
          {chambers.map((chamber) => {
            const isSelected = chamber.id === activeChamber.id;
            return (
              <DropdownItem
                key={chamber.id}
                onClick={() => switchChamber(chamber.code)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                  isSelected ? "bg-[#FAF5EE] font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${getPrefixColor(
                      chamber.patientIdPrefix
                    )}`}
                  >
                    {chamber.patientIdPrefix}
                  </span>
                  <div className="truncate text-left">
                    <p className="text-xs text-[#201C1A] leading-tight truncate">
                      {chamber.name}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#DE4F3C] shrink-0 ml-2" />}
              </DropdownItem>
            );
          })}
        </DropdownContent>
      </Dropdown>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Dropdown>
        <DropdownTrigger>
          <button
            type="button"
            disabled={isSwitching}
            aria-label="Switch Practice Chamber"
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#EAE3D9] bg-white/95 hover:bg-[#FAF5EE] shadow-2xs hover:shadow-xs transition-all text-xs text-[#201C1A] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 disabled:opacity-60"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C] group-hover:scale-105 transition-transform">
              {isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#DE4F3C]" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-[#DE4F3C]" />
              )}
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A746F] leading-none">
                Chamber
              </span>
              <span className="text-xs font-semibold text-[#201C1A] leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                {activeChamber.name}
              </span>
            </div>

            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${getPrefixColor(
                activeChamber.patientIdPrefix
              )}`}
            >
              {activeChamber.patientIdPrefix}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-[#7A746F] group-hover:text-[#201C1A] transition-colors ml-0.5 shrink-0" />
          </button>
        </DropdownTrigger>
        <DropdownContent align="right" className="w-72 p-1.5">
          <div className="px-2.5 py-2 border-b border-[#EAE3D9]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
              Practice Chambers
            </p>
            <p className="text-[11px] text-[#7A746F] mt-0.5">
              Select an active practice location to view records.
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            {chambers.map((chamber) => {
              const isSelected = chamber.id === activeChamber.id;
              return (
                <DropdownItem
                  key={chamber.id}
                  onClick={() => switchChamber(chamber.code)}
                  className={`flex items-start justify-between p-2.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? "bg-[#FAF5EE] border border-[#EAE3D9]/60" : "hover:bg-[#FAF5EE]/50"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="mt-0.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border inline-block ${getPrefixColor(
                          chamber.patientIdPrefix
                        )}`}
                      >
                        {chamber.patientIdPrefix}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className={`text-xs ${isSelected ? "font-bold text-[#201C1A]" : "font-medium text-[#201C1A]"}`}>
                        {chamber.name}
                      </p>
                      {chamber.address && (
                        <p className="text-[11px] text-[#7A746F] line-clamp-1 mt-0.5">
                          {chamber.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#DE4F3C]/10 text-[#DE4F3C] shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </DropdownItem>
              );
            })}
          </div>

          <div className="pt-2 pb-1 px-2.5 border-t border-[#EAE3D9] flex items-center justify-between text-[11px] text-[#7A746F]">
            <span>Patient ID Formats:</span>
            <span className="font-mono text-[10px]">DH-*, RNG-*, N-*</span>
          </div>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}
