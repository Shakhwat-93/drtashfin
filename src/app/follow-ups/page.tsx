"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, AlertCircle, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FollowUp } from "@/types/follow-up";
import {
  useCalendarFollowUps,
  CalendarHeader,
  MonthView,
  WeekView,
  AgendaView,
  FollowUpDetailModal,
} from "@/features/calendar";
import { SmsRemindersPanel } from "@/features/follow-ups";

export default function FollowUpsCalendarPage() {
  const [selectedFollowUp, setSelectedFollowUp] = React.useState<FollowUp | null>(null);
  const [activeTab, setActiveTab] = React.useState<"calendar" | "sms">("calendar");

  const {
    currentYear,
    currentMonth,
    currentDateStr,
    viewMode,
    chamberFilter,
    statusFilter,
    priorityFilter,
    followUps,
    followUpsByDate,
    isLoading,
    error,
    periodTitle,
    setViewMode,
    setChamberFilter,
    setStatusFilter,
    setPriorityFilter,
    goToNext,
    goToPrevious,
    goToToday,
    selectDate,
    refresh,
  } = useCalendarFollowUps();

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Page Header */}
        <PageHeader
          label="CLINICAL SCHEDULE"
          title="Follow-up Calendar & Reminders"
          description="Chamber-aware appointment schedule, patient follow-up tracking, and SMS reminder logs."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#FAF5EE] rounded-lg p-0.5 border border-[#EAE3D9]">
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    activeTab === "calendar"
                      ? "bg-white text-[#201C1A] shadow-xs"
                      : "text-[#7A746F] hover:text-[#201C1A]"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("sms")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    activeTab === "sms"
                      ? "bg-white text-[#DE4F3C] shadow-xs"
                      : "text-[#7A746F] hover:text-[#201C1A]"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#DE4F3C]" />
                  <span>SMS Reminders</span>
                </button>
              </div>

              <Link href="/patients">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Schedule Follow-up
                </Button>
              </Link>
            </div>
          }
        />

        {activeTab === "sms" ? (
          <SmsRemindersPanel />
        ) : (
          <>
            {/* Filter & Period Header */}
            <CalendarHeader
              periodTitle={periodTitle}
              viewMode={viewMode}
              chamberFilter={chamberFilter}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onViewModeChange={setViewMode}
              onChamberChange={setChamberFilter}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onToday={goToToday}
            />

            {/* Calendar View Area */}
            {isLoading ? (
              <div className="rounded-2xl border border-[#EAE3D9] bg-white p-8 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D9]">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, idx) => (
                    <Skeleton key={`cal-skel-${idx}`} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center rounded-2xl border border-[#F9D0CA] bg-[#FDF0EE] text-[#B02A1A] space-y-2">
                <AlertCircle className="h-6 w-6 mx-auto" />
                <p className="text-xs font-semibold">{error}</p>
                <Button variant="outline" size="sm" onClick={() => refresh()}>
                  Retry Loading
                </Button>
              </div>
            ) : (
              <div className="min-w-0">
                {viewMode === "month" && (
                  <MonthView
                    year={currentYear}
                    month={currentMonth}
                    followUpsByDate={followUpsByDate}
                    onSelectFollowUp={(f) => setSelectedFollowUp(f)}
                    onSelectDate={(d) => {
                      selectDate(d);
                      setViewMode("agenda");
                    }}
                  />
                )}

                {viewMode === "week" && (
                  <WeekView
                    currentDateStr={currentDateStr}
                    followUpsByDate={followUpsByDate}
                    onSelectFollowUp={(f) => setSelectedFollowUp(f)}
                    onSelectDate={(d) => selectDate(d)}
                  />
                )}

                {viewMode === "agenda" && (
                  <AgendaView
                    followUps={followUps}
                    onSelectFollowUp={(f) => setSelectedFollowUp(f)}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedFollowUp && (
          <FollowUpDetailModal
            followUp={selectedFollowUp}
            isOpen={true}
            onClose={() => setSelectedFollowUp(null)}
            onUpdated={() => refresh()}
          />
        )}
      </PageContainer>
    </AdminShell>
  );
}
