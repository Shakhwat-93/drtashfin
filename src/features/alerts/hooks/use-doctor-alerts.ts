"use client";

import * as React from "react";
import { DoctorAlert, DoctorAlertSummary, AlertSeverity } from "@/types/alert";
import { getFollowUpRepository } from "@/lib/data";
import { useChamber } from "@/features/chamber";
import { getClinicToday, calculateDaysDiff, formatAppointmentTime } from "@/lib/date-utils";

export interface UseDoctorAlertsReturn {
  alerts: DoctorAlert[];
  unreadAlerts: DoctorAlert[];
  summary: DoctorAlertSummary;
  isLoading: boolean;
  error: string | null;
  refreshAlerts: () => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useDoctorAlerts(chamberIdOverride?: string): UseDoctorAlertsReturn {
  const { activeChamber } = useChamber();
  const effectiveChamberId =
    chamberIdOverride !== undefined ? chamberIdOverride : activeChamber?.id;

  const [alerts, setAlerts] = React.useState<DoctorAlert[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAlerts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const repo = getFollowUpRepository();
      const todayStr = getClinicToday();

      // Fetch all non-completed follow-ups for active chamber (or all)
      const [allFollowUps, dismissedList] = await Promise.all([
        repo.getFollowUps({
          chamberId: effectiveChamberId,
          status: "all",
        }),
        repo.getDismissedAlertIds().catch(() => []),
      ]);

      const dismissedSet = new Set(dismissedList);
      setDismissedIds(dismissedSet);

      const generatedAlerts: DoctorAlert[] = [];

      for (const f of allFollowUps) {
        // Exclude completed follow-ups from all reminders
        if (f.status === "completed") {
          continue;
        }

        const daysDiff = calculateDaysDiff(f.scheduledDate, todayStr);
        const patientDisplayName = f.patientName || f.patientCode || "Patient";
        const timeDisplay = formatAppointmentTime(f.scheduledTime);
        const timeSuffix = timeDisplay ? ` at ${timeDisplay}` : "";

        // 1. Overdue Alerts (Scheduled in past)
        if (f.status === "scheduled" && daysDiff < 0) {
          const daysOverdue = Math.abs(daysDiff);
          const alertId = `overdue:${f.id}:${f.scheduledDate}`;
          generatedAlerts.push({
            id: alertId,
            type: "overdue",
            severity: "critical",
            followUpId: f.id,
            patientId: f.patientId,
            patientCode: f.patientCode,
            patientName: patientDisplayName,
            chamberId: f.chamberId,
            chamberName: f.chamberName,
            scheduledDate: f.scheduledDate,
            scheduledTime: f.scheduledTime,
            reason: f.reason,
            priority: f.priority,
            status: f.status,
            message: `Overdue by ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}: Follow-up for ${f.reason}`,
            daysDiff,
            timestamp: f.updatedAt || f.createdAt,
            isRead: dismissedSet.has(alertId),
          });
        }

        // 2. Due Today Alerts
        else if (f.status === "scheduled" && daysDiff === 0) {
          const alertId = `today:${f.id}:${f.scheduledDate}`;
          const isUrgent = f.priority === "urgent" || f.priority === "high";
          generatedAlerts.push({
            id: alertId,
            type: "due_today",
            severity: isUrgent ? "critical" : "warning",
            followUpId: f.id,
            patientId: f.patientId,
            patientCode: f.patientCode,
            patientName: patientDisplayName,
            chamberId: f.chamberId,
            chamberName: f.chamberName,
            scheduledDate: f.scheduledDate,
            scheduledTime: f.scheduledTime,
            reason: f.reason,
            priority: f.priority,
            status: f.status,
            message: `Follow-up scheduled today${timeSuffix}: ${f.reason}`,
            daysDiff: 0,
            timestamp: f.updatedAt || f.createdAt,
            isRead: dismissedSet.has(alertId),
          });
        }

        // 3. Urgent / High-Priority Upcoming Alerts (within next 7 days)
        else if (
          f.status === "scheduled" &&
          daysDiff > 0 &&
          daysDiff <= 7 &&
          (f.priority === "urgent" || f.priority === "high")
        ) {
          const alertId = `urgent:${f.id}:${f.scheduledDate}`;
          generatedAlerts.push({
            id: alertId,
            type: "urgent_upcoming",
            severity: "warning",
            followUpId: f.id,
            patientId: f.patientId,
            patientCode: f.patientCode,
            patientName: patientDisplayName,
            chamberId: f.chamberId,
            chamberName: f.chamberName,
            scheduledDate: f.scheduledDate,
            scheduledTime: f.scheduledTime,
            reason: f.reason,
            priority: f.priority,
            status: f.status,
            message: `High-priority follow-up in ${daysDiff} ${daysDiff === 1 ? "day" : "days"}: ${f.reason}`,
            daysDiff,
            timestamp: f.updatedAt || f.createdAt,
            isRead: dismissedSet.has(alertId),
          });
        }

        // 4. Cancelled Follow-ups (alert doctor if cancelled in past 3 days)
        else if (f.status === "cancelled" && f.cancellationReason && Math.abs(daysDiff) <= 3) {
          const alertId = `cancelled:${f.id}:${f.updatedAt}`;
          generatedAlerts.push({
            id: alertId,
            type: "cancelled",
            severity: "neutral",
            followUpId: f.id,
            patientId: f.patientId,
            patientCode: f.patientCode,
            patientName: patientDisplayName,
            chamberId: f.chamberId,
            chamberName: f.chamberName,
            scheduledDate: f.scheduledDate,
            scheduledTime: f.scheduledTime,
            reason: f.reason,
            priority: f.priority,
            status: f.status,
            message: `Follow-up cancelled: ${f.cancellationReason}`,
            daysDiff,
            timestamp: f.updatedAt,
            isRead: dismissedSet.has(alertId),
          });
        }
      }

      // Sort alerts: critical/overdue first, then due today, then upcoming
      generatedAlerts.sort((a, b) => {
        // Critical severity first
        const severityRank: Record<AlertSeverity, number> = {
          critical: 0,
          warning: 1,
          info: 2,
          neutral: 3,
        };
        if (severityRank[a.severity] !== severityRank[b.severity]) {
          return severityRank[a.severity] - severityRank[b.severity];
        }
        return (a.daysDiff ?? 0) - (b.daysDiff ?? 0);
      });

      setAlerts(generatedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctor alerts.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveChamberId]);

  React.useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const dismissAlert = React.useCallback(async (alertId: string) => {
    try {
      const repo = getFollowUpRepository();
      await repo.dismissAlert(alertId);

      setDismissedIds((prev) => new Set([...prev, alertId]));
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
      );
    } catch {
      // Local fallback
      setDismissedIds((prev) => new Set([...prev, alertId]));
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
      );
    }
  }, []);

  const markAllAsRead = React.useCallback(async () => {
    const unread = alerts.filter((a) => !a.isRead);
    const repo = getFollowUpRepository();

    await Promise.all(
      unread.map((a) => repo.dismissAlert(a.id).catch(() => {}))
    );

    const newDismissed = new Set(dismissedIds);
    unread.forEach((a) => newDismissed.add(a.id));
    setDismissedIds(newDismissed);

    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, [alerts, dismissedIds]);

  const unreadAlerts = React.useMemo(
    () => alerts.filter((a) => !a.isRead),
    [alerts]
  );

  const summary = React.useMemo<DoctorAlertSummary>(() => {
    return {
      totalAlerts: alerts.length,
      unreadCount: unreadAlerts.length,
      dueTodayCount: alerts.filter((a) => a.type === "due_today").length,
      overdueCount: alerts.filter((a) => a.type === "overdue").length,
      urgentCount: alerts.filter(
        (a) => a.type === "urgent_upcoming" || (a.type === "due_today" && (a.priority === "urgent" || a.priority === "high"))
      ).length,
    };
  }, [alerts, unreadAlerts]);

  return {
    alerts,
    unreadAlerts,
    summary,
    isLoading,
    error,
    refreshAlerts: fetchAlerts,
    dismissAlert,
    markAllAsRead,
  };
}
