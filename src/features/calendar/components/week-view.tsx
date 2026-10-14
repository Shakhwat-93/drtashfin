"use client";

import * as React from "react";
import { FollowUp } from "@/types/follow-up";
import { getWeekDays, formatAppointmentTime, isOverdueInClinic } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export interface WeekViewProps {
  currentDateStr: string;
  followUpsByDate: Record<string, FollowUp[]>;
  onSelectFollowUp: (followUp: FollowUp) => void;
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekView({
  currentDateStr,
  followUpsByDate,
  onSelectFollowUp,
  onSelectDate,
}: WeekViewProps) {
  const weekDays = React.useMemo(() => getWeekDays(currentDateStr), [currentDateStr]);

  return (
    <div className="rounded-2xl border border-[#EAE3D9] bg-white shadow-2xs overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#EAE3D9]/70 min-h-[500px]">
        {weekDays.map((day, idx) => {
          const dayFollowUps = followUpsByDate[day.dateStr] || [];
          const hasItems = dayFollowUps.length > 0;
          const isSelected = day.dateStr === currentDateStr;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex flex-col min-w-0 transition-colors ${
                day.isToday ? "bg-[#FFFDF7]" : isSelected ? "bg-[#FAF5EE]/40" : "bg-white"
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b border-[#EAE3D9]/70 flex items-center justify-between cursor-pointer ${
                  day.isToday ? "bg-[#FAF5EE]" : "bg-[#FAF5EE]/30"
                }`}
              >
                <div>
                  <span
                    className={`block text-[11px] font-bold uppercase tracking-wider ${
                      idx === 5 || idx === 6 ? "text-[#DE4F3C]" : "text-[#7A746F]"
                    }`}
                  >
                    {WEEKDAY_NAMES[idx]}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-sm font-bold ${
                        day.isToday ? "text-[#DE4F3C]" : "text-[#201C1A]"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-bold uppercase text-[#DE4F3C] px-1.5 py-0.2 rounded-full bg-[#FDF0EE]">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {hasItems && (
                  <Badge variant="neutral" size="sm" className="font-semibold text-[10px]">
                    {dayFollowUps.length}
                  </Badge>
                )}
              </div>

              {/* Follow-up Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[550px]">
                {!hasItems ? (
                  <div className="py-8 text-center text-[11px] text-[#7A746F]/60">
                    No follow-ups
                  </div>
                ) : (
                  dayFollowUps.map((f) => {
                    const isOverdue = f.status === "scheduled" && isOverdueInClinic(f.scheduledDate);
                    const time = formatAppointmentTime(f.scheduledTime);

                    return (
                      <div
                        key={f.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFollowUp(f);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs hover:border-[#DE4F3C] ${
                          f.status === "completed"
                            ? "bg-[#EBF5EE]/50 border-[#D1EAD8]"
                            : f.status === "cancelled"
                            ? "bg-[#FAF5EE]/50 border-[#EAE3D9] opacity-60"
                            : isOverdue
                            ? "bg-[#FDF0EE]/60 border-[#F9D0CA]"
                            : "bg-[#FAF5EE]/30 border-[#EAE3D9]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-serif text-xs font-semibold text-[#201C1A] truncate">
                            {f.patientName || f.patientCode}
                          </h4>
                          {f.priority && f.priority !== "routine" && (
                            <Badge
                              variant={f.priority === "urgent" ? "danger" : "warning"}
                              size="sm"
                              className="text-[9px] px-1 py-0 uppercase"
                            >
                              {f.priority}
                            </Badge>
                          )}
                        </div>

                        {f.patientCode && (
                          <span className="font-mono text-[10px] text-[#7A746F] block mt-0.5">
                            {f.patientCode}
                          </span>
                        )}

                        <p className="mt-1 text-[11px] text-[#59534E] line-clamp-2 leading-snug">
                          {f.reason}
                        </p>

                        <div className="mt-2 pt-1.5 border-t border-[#EAE3D9]/60 flex items-center justify-between text-[10px] text-[#7A746F]">
                          {time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{time}</span>
                            </div>
                          ) : (
                            <span>Time unset</span>
                          )}

                          {f.chamberName && (
                            <span className="truncate max-w-[80px]">
                              {f.chamberName.replace(" Chamber", "")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
