import {
  ClinicalDashboardData,
  DateRangePreset,
  ReportQueryParams,
  PaginatedReportResult,
  PatientActivityReportRow,
  ConsultationReportRow,
  PrescriptionReportRow,
  FollowUpReportRow,
  DiagnosticProcedureReportRow,
  DischargeReportRow,
  SmsDeliveryReportRow,
} from "@/types/reports";

export interface IReportRepository {
  /**
   * Retrieves aggregated clinical dashboard statistics, lifetime totals,
   * range metrics, and time series trends for the specified chamber and date range.
   */
  getClinicalDashboard(params: {
    chamberId?: string; // "all" or chamber UUID
    preset?: DateRangePreset;
    customStart?: string;
    customEnd?: string;
  }): Promise<ClinicalDashboardData>;

  getClinicalDashboardData(
    chamberId?: string,
    dateRange?: import("@/types/reports").DateRange
  ): Promise<ClinicalDashboardData>;

  /**
   * Report 1: Patient Activity Report (registrations, demographics, chamber breakdown)
   */
  getPatientActivityReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PatientActivityReportRow>>;

  /**
   * Report 2: Consultation Report (counts, dates, chambers, complaints, diagnoses)
   */
  getConsultationReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<ConsultationReportRow>>;

  /**
   * Report 3: Prescription Report (finalized vs draft, item counts, dates)
   */
  getPrescriptionReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PrescriptionReportRow>>;

  /**
   * Report 4: Follow-up Report (upcoming, overdue, completed, outcomes)
   */
  getFollowUpReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<FollowUpReportRow>>;

  /**
   * Report 5: Diagnostic and Procedure Report (tests by category, procedures by category)
   */
  getDiagnosticAndProcedureReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DiagnosticProcedureReportRow>>;

  getDiagnosticProcedureReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DiagnosticProcedureReportRow>>;

  /**
   * Report 6: Patient Discharge Report (conditions at discharge, follow-up recommendations)
   */
  getDischargeReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DischargeReportRow>>;

  /**
   * Report 7: SMS Delivery Report (provider statuses, retry counts)
   */
  getSmsDeliveryReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<SmsDeliveryReportRow>>;
}
