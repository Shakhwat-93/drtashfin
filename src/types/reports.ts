/**
 * Domain entity and DTO definitions for Clinical Dashboard & Medical Reports.
 * Phase 30: Clinical Dashboard & Medical Reports
 */

export type DateRangePreset =
  | "today"
  | "last7days"
  | "last30days"
  | "currentMonth"
  | "previousMonth"
  | "custom";

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export interface DashboardLifetimeTotals {
  totalPatients: number;
  totalConsultations: number;
  totalPrescriptions: number;
  totalProcedures: number;
  totalDischarges: number;
  totalDiagnosticReports: number;
  totalFollowUps?: number;
  totalFinalizedPrescriptions?: number;
  totalCompletedFollowUps?: number;
  chamberBreakdown?: Record<string, number>;
}

export interface SmsStatusSummary {
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  total: number;
}

export interface DashboardRangeMetrics {
  newPatients: number;
  consultations: number;
  finalizedPrescriptions: number;
  draftPrescriptions: number;
  upcomingFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  cancelledFollowUps: number;
  diagnosticReports: number;
  procedures: number;
  finalizedDischarges: number;
  draftDischarges: number;
  smsSummary: SmsStatusSummary;
  // Friendly aliases
  consultationsCount?: number;
  prescriptionsCount?: number;
  finalizedPrescriptionsCount?: number;
  draftPrescriptionsCount?: number;
  followUpsCount?: number;
  pendingFollowUpsCount?: number;
  completedFollowUpsCount?: number;
  overdueFollowUpsCount?: number;
  newPatientsCount?: number;
  diagnosticReportsCount?: number;
  proceduresCount?: number;
  dischargesCount?: number;
  smsDeliveredCount?: number;
  smsSentCount?: number;
}

export interface DailyActivityTrend {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Oct 12"
  patients: number;
  consultations: number;
  prescriptions: number;
  newPatients?: number;
}

export interface ChamberActivityStat {
  chamberId: string | null;
  code: string;
  name: string;
  patientCount: number;
  consultationCount: number;
  followUpCount: number;
}

export interface CategoryCountItem {
  category: string;
  count: number;
  percentage?: number;
}

export interface StatusCountItem {
  status: string;
  label: string;
  count: number;
  percentage?: number;
}

export interface ClinicalDashboardData {
  lifetime: DashboardLifetimeTotals;
  range: DashboardRangeMetrics;
  trends: DailyActivityTrend[];
  dailyTrends?: DailyActivityTrend[];
  chamberDistribution: ChamberActivityStat[];
  followUpDistribution: StatusCountItem[];
  diagnosticCategories: CategoryCountItem[];
  procedureCategories: CategoryCountItem[];
  dateRange: DateRange;
  chamberId: string | "all";
  chamberLabel?: string;
}

export type ReportType =
  | "patient-activity"
  | "consultations"
  | "prescriptions"
  | "follow-ups"
  | "diagnostic-procedures"
  | "diagnostics-procedures"
  | "discharges"
  | "sms-delivery";

export interface ReportQueryParams {
  chamberId?: string; // "all" or specific chamber UUID
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dateRange?: DateRange;
  searchQuery?: string;
  status?: string;
  category?: string;
  type?: "all" | "diagnostic" | "procedure";
  page?: number;
  pageSize?: number;
}

// 1. Patient Activity Report Item
export interface PatientActivityReportRow {
  id: string;
  patientId: string; // e.g. "DH-000001" or "PT-000013"
  name: string;
  gender: string;
  age: number;
  dateOfBirth?: string;
  phone: string;
  bloodGroup: string;
  chamberId: string | null;
  chamberName: string;
  registeredDate: string; // YYYY-MM-DD
  createdAt: string;
}

// 2. Consultation Report Item
export interface ConsultationReportRow {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  chamberId: string | null;
  chamberName: string;
  consultationDate: string; // YYYY-MM-DD
  chiefComplaint: string;
  diagnosis: string;
  advice: string;
  createdAt: string;
}

// 3. Prescription Report Item
export interface PrescriptionReportRow {
  id: string;
  prescriptionCode: string; // e.g. "RX-000008"
  patientId: string;
  patientCode: string;
  patientName: string;
  chamberId: string | null;
  chamberName: string;
  prescriptionDate: string; // YYYY-MM-DD
  status: "draft" | "finalized";
  itemsCount: number;
  hasArchivedPdf: boolean;
  finalizedAt: string | null;
  createdAt: string;
}

// 4. Follow-Up Report Item
export interface FollowUpReportRow {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  chamberId: string | null;
  chamberName: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string | null;
  reason: string;
  status: "scheduled" | "completed" | "missed" | "cancelled" | "rescheduled";
  priority: "normal" | "high" | "urgent" | "routine" | "review" | string;
  clinicalOutcome: string | null;
  outcomeNotes: string | null;
  createdAt: string;
}

// 5. Diagnostic & Procedure Report Item
export interface DiagnosticProcedureReportRow {
  id: string;
  itemType: "diagnostic" | "procedure";
  patientId: string;
  patientCode: string;
  patientName: string;
  title: string;
  category: string;
  activityDate: string; // YYYY-MM-DD
  facilityOrCenter: string | null;
  details: string | null;
  driveUrl: string | null;
  createdAt: string;
}

// 6. Discharge Report Item
export interface DischargeReportRow {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dischargeDate: string; // YYYY-MM-DD
  dischargeTime: string | null;
  status: "draft" | "finalized";
  conditionAtDischarge: string;
  finalDiagnosis: string;
  clinicalReason: string;
  recommendedFollowUpDate: string | null;
  finalizedAt: string | null;
  createdAt: string;
}

// 7. SMS Delivery Report Item
export interface SmsDeliveryReportRow {
  id: string;
  followUpId: string | null;
  patientId: string | null;
  patientCode: string;
  patientName: string;
  recipientPhoneMasked: string;
  reminderType: string;
  scheduledFor: string;
  status: string; // "pending" | "sent" | "delivered" | "failed"
  deliveryStatus: string;
  retryCount: number;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface PaginatedReportResult<T> {
  records: T[];
  total: number;
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summaryStats?: Record<string, number | string>;
}
