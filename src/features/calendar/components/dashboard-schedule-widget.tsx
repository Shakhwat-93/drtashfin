"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { FollowUp } from "@/types/follow-up";
import { getFollowUpRepository } from "@/lib/data";
import { useChamber } from "@/features/chamber";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import {
  getClinicToday,
  formatAppointmentTime,
  formatDisplayDate,
  isOverdueInClinic,
} from "@/lib/date-utils";

export type ScheduleTab = "today" | "overdue" | "upcoming" | "urgent" | "completed";

export function DashboardScheduleWidget() {
  const { activeChamber } = useChamber();
  const [activeTab, setActiveTab] = React.useState<ScheduleTab>("today");
  const [followUps, setFollowUps] = React.useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const todayStr = React.useMemo(() => getClinicToday(), []);

  const loadFollowUps = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const repo = getFollowUpRepository();
      const list = await repo.getFollowUps({
        chamberId: activeChamber?.id,
        status: "all",
      });
      setFollowUps(list);
    } catch {
      // Fallback
      setFollowUps([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeChamber]);

  React.useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // Categorize lists
  const todayList = React.useMemo(
    () => followUps.filter((f) => f.status === "scheduled" && f.scheduledDate === todayStr),
    [followUps, todayStr]
  );

  const overdueList = React.useMemo(
    () => followUps.filter((f) => f.status === "scheduled" && f.scheduledDate < todayStr),
    [followUps, todayStr]
  );

  const upcomingList = React.useMemo(
    () =>
      followUps
        .filter((f) => f.status === "scheduled" && f.scheduledDate > todayStr)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 10),
    [followUps, todayStr]
  );

  const urgentList = React.useMemo(
    () =>
      followUps.filter(
        (f) =>
          f.status === "scheduled" &&
          (f.priority === "urgent" || f.priority === "high")
      ),
    [followUps]
  );

  const completedList = React.useMemo(
    () =>
      followUps
        .filter((f) => f.status === "completed")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10),
    [followUps]
  );

  const activeItems = React.useMemo(() => {
    switch (activeTab) {
      case "overdue":
        return overdueList;
      case "upcoming":
        return upcomingList;
      case "urgent":
        return urgentList;
      case "completed":
        return completedList;
      case "today":
      default:
        return todayList;
    }
  }, [activeTab, todayList, overdueList, upcomingList, urgentList, completedList]);

  return (
    <Card className="min-w-0 shadow-2xs border-[#EAE3D9]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2 border-b border-[#EAE3D9]/60">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#DE4F3C]" />
          <CardTitle>Daily Schedule & Follow-ups</CardTitle>
          {overdueList.length > 0 && (
            <Badge variant="danger" size="sm" className="font-bold text-[10px]">
              {overdueList.length} Overdue
            </Badge>
          )}
        </div>

        <Link
          href="/follow-ups"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:text-[#B02A1A] transition-colors"
        >
          <span>Full Calendar</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "today"
                ? "bg-white text-[#201C1A] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            <span>Today</span>
            <span className="text-[10px] px-1 rounded-full bg-[#FAF5EE] text-[#7A746F]">
              {todayList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "overdue"
                ? "bg-[#DE4F3C] text-white font-semibold shadow-xs"
                : overdueList.length > 0
                ? "text-[#DE4F3C] font-semibold"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            <span>Overdue</span>
            {overdueList.length > 0 && (
              <span className={`text-[10px] px-1 rounded-full ${
                activeTab === "overdue" ? "bg-white/20 text-white" : "bg-[#FDF0EE] text-[#DE4F3C]"
              }`}>
                {overdueList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "upcoming"
                ? "bg-white text-[#201C1A] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            <span>Upcoming</span>
            <span className="text-[10px] px-1 rounded-full bg-[#FAF5EE] text-[#7A746F]">
              {upcomingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("urgent")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "urgent"
                ? "bg-white text-[#201C1A] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            <span>Urgent</span>
            {urgentList.length > 0 && (
              <span className="text-[10px] px-1 rounded-full bg-[#FDF0EE] text-[#DE4F3C]">
                {urgentList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-white text-[#201C1A] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            <span>Completed</span>
            <span className="text-[10px] px-1 rounded-full bg-[#FAF5EE] text-[#7A746F]">
              {completedList.length}
            </span>
          </button>
        </div>

        {/* Content List */}
        <div className="space-y-2.5 min-h-[180px]">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={`sched-skel-${idx}`} className="h-16 w-full rounded-xl" />
            ))
          ) : activeItems.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-[#201C1A]">
                {activeTab === "overdue"
                  ? "Zero overdue follow-ups"
                  : activeTab === "today"
                  ? "No follow-ups due today"
                  : `No ${activeTab} appointments found`}
              </p>
              <p className="text-[11px] text-[#7A746F]">
                Active chamber schedule is all clear.
              </p>
            </div>
          ) : (
            activeItems.map((item) => {
              const targetPatient = item.patientCode || item.patientId;
              const time = formatAppointmentTime(item.scheduledTime);
              const isOverdue = item.status === "scheduled" && isOverdueInClinic(item.scheduledDate);

              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                    isOverdue
                      ? "bg-[#FFF8F7] border-[#F9D0CA]"
                      : item.status === "completed"
                      ? "bg-[#EBF5EE]/40 border-[#D1EAD8]"
                      : "bg-[#FAF5EE]/60 border-[#EAE3D9] hover:bg-[#FAF5EE]"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-xs font-semibold text-[#201C1A] truncate">
                        {item.patientName || item.patientCode}
                      </h4>
                      {item.patientCode && (
                        <span className="font-mono text-[10px] text-[#7A746F]">
                          {item.patientCode}
                        </span>
                      )}
                      {item.priority && item.priority !== "routine" && (
                        <Badge
                          variant={item.priority === "urgent" ? "danger" : "warning"}
                          size="sm"
                          className="text-[9px] px-1 py-0 uppercase"
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-[#59534E] leading-snug line-clamp-1">
                      {item.reason}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-[#7A746F]">
                      <span>{formatDisplayDate(item.scheduledDate, { month: "short", day: "numeric" })}</span>
                      {time && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                          </div>
                        </>
                      )}
                      {item.chamberName && (
                        <>
                          <span>•</span>
                          <span>{item.chamberName.replace(" Chamber", "")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-center">
                    <Link
                      href={`/patients/${targetPatient}`}
                      title={`Open file for ${item.patientName || item.patientCode}`}
                    >
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        Profile
                      </Button>
                    </Link>

                    {item.status === "scheduled" && (
                      <Link
                        href={`/patients/${targetPatient}/consultations/new?isFollowUp=true&originatingConsultationId=${item.id}`}
                        title="Record follow-up consultation"
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          leftIcon={<Stethoscope className="h-3 w-3" />}
                        >
                          Visit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
