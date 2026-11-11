"use client";

import * as React from "react";
import { FollowUp } from "@/types/follow-up";
import { getMonthGrid, isOverdueInClinic, formatAppointmentTime } from "@/lib/date-utils";
import { AlertCircle } from "lucide-react";

export interface MonthViewProps {
  year: number;
  month: number;
  followUpsByDate: Record<string, FollowUp[]>;
  onSelectFollowUp: (followUp: FollowUp) => void;
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthView({
  year,
  month,
  followUpsByDate,
  onSelectFollowUp,
  onSelectDate,
}: MonthViewProps) {
  const gridCells = React.useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <div className="rounded-2xl border border-[#EAE3D9] bg-white shadow-2xs overflow-hidden min-w-0">
      {/* Weekday Header Columns */}
      <div className="grid grid-cols-7 border-b border-[#EAE3D9] bg-[#FAF5EE]/70 text-center">
        {WEEKDAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={`py-2 sm:py-2.5 text-[11px] sm:text-xs font-semibold ${
              idx === 5 || idx === 6 ? "text-[#DE4F3C]" : "text-[#7A746F]"
            }`}
          >
            <span className="sm:hidden">{WEEKDAY_SHORT[idx]}</span>
            <span className="hidden sm:inline">{name}</span>
          </div>
        ))}
      </div>

      {/* Days Grid (7 columns x 5 or 6 rows) */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#EAE3D9]/60">
        {gridCells.map((cell) => {
          const dayFollowUps = followUpsByDate[cell.dateStr] || [];
          const hasFollowUps = dayFollowUps.length > 0;
          const displayLimit = 3;
          const visibleItems = dayFollowUps.slice(0, displayLimit);
          const remainingCount = dayFollowUps.length - displayLimit;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[68px] sm:min-h-[125px] min-w-0 p-1 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                !cell.isCurrentMonth
                  ? "bg-[#FAF5EE]/30 text-[#7A746F]/50"
                  : cell.isToday
                  ? "bg-[#FFFDF7]"
                  : "bg-white hover:bg-[#FAF5EE]/40"
              }`}
            >
              {/* Day Cell Top: Date Number & Badge */}
              <div className="flex items-center justify-between gap-0.5 min-w-0">
                <span
                  className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
                    cell.isToday
                      ? "bg-[#DE4F3C] text-white shadow-xs"
                      : cell.isCurrentMonth
                      ? "text-[#201C1A]"
                      : "text-[#7A746F]/50"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {hasFollowUps && (
                  <span className="text-[9px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.2 rounded-full bg-[#FAF5EE] text-[#7A746F] border border-[#EAE3D9] leading-tight">
                    {dayFollowUps.length}
                  </span>
                )}
              </div>

              {/* Compact Mobile Indicator Dots (< sm) */}
              {hasFollowUps && (
                <div className="mt-1 flex sm:hidden flex-wrap items-center justify-center gap-0.5 px-0.5">
                  {dayFollowUps.slice(0, 4).map((f) => {
                    const isOverdue = f.status === "scheduled" && isOverdueInClinic(f.scheduledDate);
                    const isUrgent = f.priority === "urgent" || f.priority === "high";
                    const dotColor =
                      f.status === "completed"
                        ? "bg-emerald-500"
                        : f.status === "cancelled"
                        ? "bg-[#7A746F]/50"
                        : isOverdue || isUrgent
                        ? "bg-[#DE4F3C]"
                        : "bg-sky-500";
                    return (
                      <span
                        key={f.id}
                        className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Desktop / Tablet Day Follow-up Items (sm+) */}
              <div className="mt-1 flex-1 space-y-1 overflow-hidden hidden sm:block">
                {visibleItems.map((f) => {
                  const isOverdue = f.status === "scheduled" && isOverdueInClinic(f.scheduledDate);
                  const isUrgent = f.priority === "urgent" || f.priority === "high";
                  const time = formatAppointmentTime(f.scheduledTime);

                  let pillStyle = "bg-[#EEF5FA] text-[#1D5D9B] border-[#D3E4F4]";
                  if (f.status === "completed") {
                    pillStyle = "bg-[#EBF5EE] text-[#1F6B38] border-[#D1EAD8]";
                  } else if (f.status === "cancelled") {
                    pillStyle = "bg-[#FAF5EE] text-[#7A746F] border-[#EAE3D9] line-through";
                  } else if (isOverdue || isUrgent) {
                    pillStyle = "bg-[#FDF0EE] text-[#B02A1A] border-[#F9D0CA]";
                  } else if (cell.isToday) {
                    pillStyle = "bg-[#FEF7EB] text-[#975B00] border-[#FCE7BE]";
                  }

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFollowUp(f);
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded border text-[11px] truncate flex items-center gap-1 transition-transform hover:scale-[1.02] ${pillStyle}`}
                      title={`${f.patientName || f.patientCode}: ${f.reason}`}
                    >
                      {isOverdue && <AlertCircle className="h-2.5 w-2.5 shrink-0 text-[#B02A1A]" />}
                      {time && <span className="text-[9px] font-mono shrink-0">{time}</span>}
                      <span className="truncate font-medium">
                        {f.patientName || f.patientCode}
                      </span>
                    </button>
                  );
                })}

                {remainingCount > 0 && (
                  <span className="block text-[10px] font-semibold text-[#7A746F] pl-1">
                    +{remainingCount} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
