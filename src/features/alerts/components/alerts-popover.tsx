"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  AlertCircle,
  Clock,
  AlertTriangle,
  Calendar,
  X,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useDoctorAlerts } from "../hooks/use-doctor-alerts";
import { DoctorAlertType } from "@/types/alert";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { formatDisplayDate, formatAppointmentTime } from "@/lib/date-utils";

export interface AlertsPopoverProps {
  className?: string;
}

export function AlertsPopover({ className }: AlertsPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "overdue" | "today" | "urgent">("all");
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const {
    alerts,
    summary,
    isLoading,
    dismissAlert,
    markAllAsRead,
  } = useDoctorAlerts();

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredAlerts = React.useMemo(() => {
    if (activeTab === "overdue") {
      return alerts.filter((a) => a.type === "overdue");
    }
    if (activeTab === "today") {
      return alerts.filter((a) => a.type === "due_today");
    }
    if (activeTab === "urgent") {
      return alerts.filter(
        (a) =>
          a.type === "urgent_upcoming" ||
          (a.type === "due_today" && (a.priority === "urgent" || a.priority === "high"))
      );
    }
    return alerts;
  }, [alerts, activeTab]);

  const renderAlertIcon = (type: DoctorAlertType, priority?: string) => {
    if (type === "overdue") {
      return <AlertCircle className="h-4 w-4 text-[#DE4F3C]" />;
    }
    if (type === "due_today") {
      return <Clock className="h-4 w-4 text-[#D97706]" />;
    }
    if (type === "urgent_upcoming" || priority === "urgent") {
      return <AlertTriangle className="h-4 w-4 text-[#DE4F3C]" />;
    }
    return <Calendar className="h-4 w-4 text-[#1D5D9B]" />;
  };

  return (
    <div className={`relative ${className || ""}`} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <div className="relative">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={`View clinical alerts (${summary.unreadCount} unread)`}
          onClick={() => setIsOpen(!isOpen)}
          className={`text-[#7A746F] hover:text-[#201C1A] ${
            isOpen ? "bg-[#FAF5EE] text-[#201C1A]" : ""
          }`}
        >
          <Bell className="h-4 w-4" />
        </IconButton>

        {/* Dynamic Badge indicator */}
        {summary.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#DE4F3C] text-[10px] font-bold text-white shadow-xs animate-pulse">
            {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
          </span>
        )}
      </div>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] rounded-2xl border border-[#EAE3D9] bg-white shadow-[0_12px_36px_rgba(32,28,26,0.14)] z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE3D9] bg-[#FAF5EE]/50">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#DE4F3C]" />
              <h3 className="font-serif text-sm font-semibold text-[#201C1A]">
                Clinical Alerts
              </h3>
              {summary.unreadCount > 0 ? (
                <Badge variant="danger" size="sm" className="font-semibold">
                  {summary.unreadCount} new
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Up to date
                </Badge>
              )}
            </div>

            {summary.unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-[#7A746F] hover:text-[#DE4F3C] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#EAE3D9]/60 bg-white overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === "all"
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "text-[#7A746F] hover:bg-[#FAF5EE] hover:text-[#201C1A]"
              }`}
            >
              All ({summary.totalAlerts})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overdue")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "overdue"
                  ? "bg-[#DE4F3C] text-white shadow-xs"
                  : "text-[#7A746F] hover:bg-[#FAF5EE] hover:text-[#201C1A]"
              }`}
            >
              <span>Overdue</span>
              {summary.overdueCount > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${
                  activeTab === "overdue" ? "bg-white/20 text-white" : "bg-[#FDF0EE] text-[#DE4F3C]"
                }`}>
                  {summary.overdueCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "today"
                  ? "bg-[#D97706] text-white shadow-xs"
                  : "text-[#7A746F] hover:bg-[#FAF5EE] hover:text-[#201C1A]"
              }`}
            >
              <span>Today</span>
              {summary.dueTodayCount > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${
                  activeTab === "today" ? "bg-white/20 text-white" : "bg-[#FEF7EB] text-[#D97706]"
                }`}>
                  {summary.dueTodayCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("urgent")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "urgent"
                  ? "bg-[#DE4F3C] text-white shadow-xs"
                  : "text-[#7A746F] hover:bg-[#FAF5EE] hover:text-[#201C1A]"
              }`}
            >
              <span>Urgent</span>
              {summary.urgentCount > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${
                  activeTab === "urgent" ? "bg-white/20 text-white" : "bg-[#FDF0EE] text-[#DE4F3C]"
                }`}>
                  {summary.urgentCount}
                </span>
              )}
            </button>
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[160px] max-h-[380px]">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#7A746F]">
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-[#201C1A]">
                  No alerts in this category
                </p>
                <p className="text-[11px] text-[#7A746F]">
                  Follow-up schedule is currently up to date.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const targetPatient = alert.patientCode || alert.patientId;
                const timeStr = formatAppointmentTime(alert.scheduledTime);

                return (
                  <div
                    key={alert.id}
                    className={`group relative p-3 rounded-xl border transition-all ${
                      alert.isRead
                        ? "bg-white border-[#EAE3D9] opacity-75 hover:opacity-100"
                        : alert.type === "overdue"
                        ? "bg-[#FFF8F7] border-[#F9D0CA] shadow-2xs"
                        : alert.type === "due_today"
                        ? "bg-[#FFFDF7] border-[#FCE7BE] shadow-2xs"
                        : "bg-white border-[#EAE3D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {renderAlertIcon(alert.type, alert.priority)}
                        <h4 className="font-serif text-xs font-semibold text-[#201C1A] truncate">
                          {alert.patientName}
                        </h4>
                        {alert.patientCode && (
                          <span className="font-mono text-[10px] text-[#7A746F]">
                            {alert.patientCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {alert.chamberName && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            {alert.chamberName.replace(" Chamber", "")}
                          </Badge>
                        )}
                        {!alert.isRead && (
                          <button
                            type="button"
                            onClick={() => dismissAlert(alert.id)}
                            title="Dismiss alert"
                            className="p-1 rounded text-[#7A746F] hover:text-[#DE4F3C] hover:bg-[#FAF5EE]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-[#59534E] leading-snug line-clamp-2">
                      {alert.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-[#EAE3D9]/50">
                      <div className="flex items-center gap-2 text-[#7A746F]">
                        <span>{formatDisplayDate(alert.scheduledDate, { month: "short", day: "numeric" })}</span>
                        {timeStr && (
                          <>
                            <span>•</span>
                            <span>{timeStr}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/patients/${targetPatient}`}
                          onClick={() => setIsOpen(false)}
                          className="text-[#1D5D9B] hover:underline font-medium"
                        >
                          View File
                        </Link>
                        <span>•</span>
                        <Link
                          href={`/patients/${targetPatient}/consultations/new?isFollowUp=true&originatingConsultationId=${alert.followUpId}`}
                          onClick={() => setIsOpen(false)}
                          className="text-[#DE4F3C] hover:underline font-semibold"
                        >
                          Start Visit
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Calendar Link */}
          <div className="p-3 border-t border-[#EAE3D9] bg-[#FAF5EE]/70 flex items-center justify-between">
            <span className="text-[11px] text-[#7A746F]">
              Dr. Tashfin Schedule Manager
            </span>
            <Link
              href="/follow-ups"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:text-[#B02A1A]"
            >
              <span>Open Follow-up Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
