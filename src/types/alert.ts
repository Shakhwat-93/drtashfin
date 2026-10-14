import { FollowUpPriority, FollowUpStatus } from "./follow-up";

export type DoctorAlertType =
  | "due_today"
  | "overdue"
  | "urgent_upcoming"
  | "rescheduled"
  | "cancelled";

export type AlertSeverity = "critical" | "warning" | "info" | "neutral";

export interface DoctorAlert {
  id: string; // Unique deterministic ID (e.g. "today:uuid:date")
  type: DoctorAlertType;
  severity: AlertSeverity;
  followUpId: string;
  patientId: string;
  patientCode?: string;
  patientName?: string;
  chamberId?: string;
  chamberName?: string;
  scheduledDate: string;
  scheduledTime?: string;
  reason: string;
  priority?: FollowUpPriority;
  status: FollowUpStatus;
  message: string;
  daysDiff?: number; // Days overdue (negative) or days until appointment (positive)
  timestamp: string; // Creation / update time
  isRead: boolean;
}

export interface DoctorAlertSummary {
  totalAlerts: number;
  unreadCount: number;
  dueTodayCount: number;
  overdueCount: number;
  urgentCount: number;
}
