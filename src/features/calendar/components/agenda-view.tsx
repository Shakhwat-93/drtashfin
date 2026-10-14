"use client";

import * as React from "react";
import Link from "next/link";
import { FollowUp } from "@/types/follow-up";
import { formatDisplayDate, formatAppointmentTime, isOverdueInClinic, isTodayInClinic } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Stethoscope } from "lucide-react";

export interface AgendaViewProps {
  followUps: FollowUp[];
  onSelectFollowUp: (followUp: FollowUp) => void;
}

export function AgendaView({ followUps, onSelectFollowUp }: AgendaViewProps) {
  // Group follow-ups by date
  const grouped = React.useMemo(() => {
    const groups: { dateStr: string; items: FollowUp[] }[] = [];
    const map = new Map<string, FollowUp[]>();

    // Sort chronologically ascending
    const sorted = [...followUps].sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    for (const f of sorted) {
      if (!map.has(f.scheduledDate)) {
        map.set(f.scheduledDate, []);
      }
      map.get(f.scheduledDate)!.push(f);
    }

    map.forEach((items, dateStr) => {
      groups.push({ dateStr, items });
    });

    return groups;
  }, [followUps]);

  if (followUps.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-[#EAE3D9] bg-white shadow-2xs space-y-3">
        <Calendar className="h-10 w-10 text-[#7A746F]/50 mx-auto" />
        <h3 className="font-serif text-base font-semibold text-[#201C1A]">
          No follow-up appointments scheduled
        </h3>
        <p className="text-xs text-[#7A746F] max-w-sm mx-auto">
          No follow-ups match the selected chamber, status, or date filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ dateStr, items }) => {
        const isToday = isTodayInClinic(dateStr);
        const isOverdue = isOverdueInClinic(dateStr);

        return (
          <div key={dateStr} className="space-y-3">
            {/* Date Section Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#EAE3D9]">
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${isToday ? "text-[#DE4F3C]" : "text-[#7A746F]"}`} />
                <h3 className="font-serif text-sm font-bold text-[#201C1A]">
                  {formatDisplayDate(dateStr, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h3>
                {isToday && (
                  <Badge variant="warning" size="sm" className="font-bold">
                    TODAY
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="danger" size="sm" className="font-bold">
                    OVERDUE
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium text-[#7A746F]">
                {items.length} {items.length === 1 ? "appointment" : "appointments"}
              </span>
            </div>

            {/* Appointment Cards */}
            <div className="grid grid-cols-1 gap-3">
              {items.map((f) => {
                const targetPatient = f.patientCode || f.patientId;
                const timeStr = formatAppointmentTime(f.scheduledTime);
                const itemOverdue = f.status === "scheduled" && isOverdueInClinic(f.scheduledDate);

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      f.status === "completed"
                        ? "bg-[#EBF5EE]/30 border-[#D1EAD8]"
                        : f.status === "cancelled"
                        ? "bg-[#FAF5EE]/40 border-[#EAE3D9] opacity-75"
                        : itemOverdue
                        ? "bg-[#FFF8F7] border-[#F9D0CA]"
                        : isToday
                        ? "bg-[#FFFDF7] border-[#FCE7BE]"
                        : "bg-white border-[#EAE3D9] shadow-2xs hover:border-[#DFD7CB]"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif text-sm font-semibold text-[#201C1A]">
                          {f.patientName || "Unrecorded Patient"}
                        </h4>
                        {f.patientCode && (
                          <span className="font-mono text-xs font-medium text-[#7A746F]">
                            {f.patientCode}
                          </span>
                        )}
                        {f.chamberName && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            {f.chamberName.replace(" Chamber", "")}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            f.status === "completed"
                              ? "success"
                              : f.status === "cancelled"
                              ? "neutral"
                              : itemOverdue
                              ? "danger"
                              : "info"
                          }
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {itemOverdue ? "Overdue" : f.status}
                        </Badge>
                        {f.priority && f.priority !== "routine" && (
                          <Badge
                            variant={f.priority === "urgent" ? "danger" : "warning"}
                            size="sm"
                            className="capitalize text-[10px]"
                          >
                            {f.priority}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-[#59534E] leading-snug">
                        {f.reason}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7A746F] pt-1">
                        {timeStr ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{timeStr}</span>
                          </div>
                        ) : (
                          <span className="italic text-[#7A746F]/70">Time unassigned</span>
                        )}
                        {f.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">&ldquo;{f.notes}&rdquo;</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectFollowUp(f)}
                      >
                        Details
                      </Button>
                      <Link href={`/patients/${targetPatient}`}>
                        <Button variant="ghost" size="sm">
                          Patient File
                        </Button>
                      </Link>
                      <Link
                        href={`/patients/${targetPatient}/consultations/new?isFollowUp=true&originatingConsultationId=${f.id}`}
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Stethoscope className="h-3.5 w-3.5" />}
                        >
                          Record Visit
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
