import { SupabaseClient } from "@supabase/supabase-js";
import { IReportRepository } from "./report-repository.interface";
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
  ChamberActivityStat,
  StatusCountItem,
  CategoryCountItem,
  DailyActivityTrend,
} from "@/types/reports";
import { supabase } from "@/lib/supabase/client";
import {
  resolveDateRange,
  generateDailyDateSeries,
  toUtcTimestampRange,
} from "@/lib/reports/date-range-utils";
import { getClinicToday, CLINIC_TIMEZONE } from "@/lib/date-utils";
import { KNOWN_CHAMBERS } from "@/types/chamber";

type DbRow = Record<string, unknown>;

interface PatientJoin {
  patient_id?: string;
  name?: string;
  chamber_id?: string | null;
}

function extractPatient(patients: unknown): PatientJoin | undefined {
  if (Array.isArray(patients)) return (patients[0] || {}) as PatientJoin;
  if (patients && typeof patients === "object") return patients as PatientJoin;
  return undefined;
}

export class SupabaseReportRepository implements IReportRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  private getChamberName(chamberId?: string | null): string {
    if (!chamberId) return "Unassigned (Legacy)";
    const found = KNOWN_CHAMBERS.find(
      (c) => c.id === chamberId || c.code === chamberId
    );
    return found ? found.name : "Other Chamber";
  }

  public async getClinicalDashboard(params: {
    chamberId?: string;
    preset?: DateRangePreset;
    customStart?: string;
    customEnd?: string;
  }): Promise<ClinicalDashboardData> {
    const dateRange = resolveDateRange(
      params.preset || "last30days",
      params.customStart,
      params.customEnd
    );
    const { startIso, endIso } = toUtcTimestampRange(
      dateRange.startDate,
      dateRange.endDate
    );
    const todayYmd = getClinicToday(CLINIC_TIMEZONE);
    const chamberId =
      params.chamberId && params.chamberId !== "all"
        ? params.chamberId
        : undefined;

    // --- 1. Lifetime Totals ---
    let pLifeQuery = this.client
      .from("patients")
      .select("*", { count: "exact", head: true });
    if (chamberId) pLifeQuery = pLifeQuery.eq("chamber_id", chamberId);

    let cLifeQuery = this.client
      .from("consultations")
      .select("*", { count: "exact", head: true });
    if (chamberId) cLifeQuery = cLifeQuery.eq("chamber_id", chamberId);

    let rxLifeQuery = this.client
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "finalized");
    if (chamberId) rxLifeQuery = rxLifeQuery.eq("chamber_id", chamberId);

    const procLifeQuery = chamberId
      ? this.client
          .from("patient_procedures")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_procedures")
          .select("*", { count: "exact", head: true });

    const disLifeQuery = chamberId
      ? this.client
          .from("patient_discharges")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .eq("status", "finalized")
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_discharges")
          .select("*", { count: "exact", head: true })
          .eq("status", "finalized");

    const diagLifeQuery = chamberId
      ? this.client
          .from("diagnostic_reports")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("diagnostic_reports")
          .select("*", { count: "exact", head: true });

    const [
      { count: totalPatients },
      { count: totalConsultations },
      { count: totalPrescriptions },
      { count: totalProcedures },
      { count: totalDischarges },
      { count: totalDiagnosticReports },
    ] = await Promise.all([
      pLifeQuery,
      cLifeQuery,
      rxLifeQuery,
      procLifeQuery,
      disLifeQuery,
      diagLifeQuery,
    ]);

    const lifetime = {
      totalPatients: totalPatients || 0,
      totalConsultations: totalConsultations || 0,
      totalPrescriptions: totalPrescriptions || 0,
      totalProcedures: totalProcedures || 0,
      totalDischarges: totalDischarges || 0,
      totalDiagnosticReports: totalDiagnosticReports || 0,
    };

    // --- 2. Date-Range Activity Metrics ---
    let pRangeQuery = this.client
      .from("patients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    if (chamberId) pRangeQuery = pRangeQuery.eq("chamber_id", chamberId);

    let cRangeQuery = this.client
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .gte("consultation_date", dateRange.startDate)
      .lte("consultation_date", dateRange.endDate);
    if (chamberId) cRangeQuery = cRangeQuery.eq("chamber_id", chamberId);

    let rxFinRangeQuery = this.client
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "finalized")
      .gte("prescription_date", dateRange.startDate)
      .lte("prescription_date", dateRange.endDate);
    if (chamberId) rxFinRangeQuery = rxFinRangeQuery.eq("chamber_id", chamberId);

    let rxDraftRangeQuery = this.client
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    if (chamberId) rxDraftRangeQuery = rxDraftRangeQuery.eq("chamber_id", chamberId);

    // Follow-ups
    let fuUpcomingQuery = this.client
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("scheduled_date", todayYmd);
    if (chamberId) fuUpcomingQuery = fuUpcomingQuery.eq("chamber_id", chamberId);

    let fuOverdueQuery = this.client
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("status", "scheduled")
      .lt("scheduled_date", todayYmd);
    if (chamberId) fuOverdueQuery = fuOverdueQuery.eq("chamber_id", chamberId);

    let fuCompletedQuery = this.client
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("scheduled_date", dateRange.startDate)
      .lte("scheduled_date", dateRange.endDate);
    if (chamberId) fuCompletedQuery = fuCompletedQuery.eq("chamber_id", chamberId);

    let fuCancelledQuery = this.client
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .in("status", ["cancelled", "missed"])
      .gte("scheduled_date", dateRange.startDate)
      .lte("scheduled_date", dateRange.endDate);
    if (chamberId) fuCancelledQuery = fuCancelledQuery.eq("chamber_id", chamberId);

    // Diagnostics & Procedures & Discharges in range
    const diagRangeQuery = chamberId
      ? this.client
          .from("diagnostic_reports")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .gte("test_date", dateRange.startDate)
          .lte("test_date", dateRange.endDate)
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("diagnostic_reports")
          .select("*", { count: "exact", head: true })
          .gte("test_date", dateRange.startDate)
          .lte("test_date", dateRange.endDate);

    const procRangeQuery = chamberId
      ? this.client
          .from("patient_procedures")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .gte("procedure_date", dateRange.startDate)
          .lte("procedure_date", dateRange.endDate)
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_procedures")
          .select("*", { count: "exact", head: true })
          .gte("procedure_date", dateRange.startDate)
          .lte("procedure_date", dateRange.endDate);

    const disFinRangeQuery = chamberId
      ? this.client
          .from("patient_discharges")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .eq("status", "finalized")
          .gte("discharge_date", dateRange.startDate)
          .lte("discharge_date", dateRange.endDate)
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_discharges")
          .select("*", { count: "exact", head: true })
          .eq("status", "finalized")
          .gte("discharge_date", dateRange.startDate)
          .lte("discharge_date", dateRange.endDate);

    const disDraftRangeQuery = chamberId
      ? this.client
          .from("patient_discharges")
          .select("id, patients!inner(chamber_id)", { count: "exact", head: true })
          .eq("status", "draft")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_discharges")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft")
          .gte("created_at", startIso)
          .lte("created_at", endIso);

    // SMS Reminders query
    const smsRangeQuery = this.client
      .from("sms_reminders")
      .select("delivery_status")
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    const [
      { count: newPatients },
      { count: consultationsCount },
      { count: finalizedPrescriptions },
      { count: draftPrescriptions },
      { count: upcomingFollowUps },
      { count: overdueFollowUps },
      { count: completedFollowUps },
      { count: cancelledFollowUps },
      { count: diagnosticReportsCount },
      { count: proceduresCount },
      { count: finalizedDischarges },
      { count: draftDischarges },
      { data: smsRows },
    ] = await Promise.all([
      pRangeQuery,
      cRangeQuery,
      rxFinRangeQuery,
      rxDraftRangeQuery,
      fuUpcomingQuery,
      fuOverdueQuery,
      fuCompletedQuery,
      fuCancelledQuery,
      diagRangeQuery,
      procRangeQuery,
      disFinRangeQuery,
      disDraftRangeQuery,
      smsRangeQuery,
    ]);

    const smsSummary = {
      pending: (smsRows || []).filter((s) => s.delivery_status === "pending").length,
      sent: (smsRows || []).filter((s) => s.delivery_status === "sent").length,
      delivered: (smsRows || []).filter((s) => s.delivery_status === "delivered").length,
      failed: (smsRows || []).filter((s) => s.delivery_status === "failed").length,
      total: (smsRows || []).length,
    };

    const range = {
      newPatients: newPatients || 0,
      consultations: consultationsCount || 0,
      finalizedPrescriptions: finalizedPrescriptions || 0,
      draftPrescriptions: draftPrescriptions || 0,
      upcomingFollowUps: upcomingFollowUps || 0,
      overdueFollowUps: overdueFollowUps || 0,
      completedFollowUps: completedFollowUps || 0,
      cancelledFollowUps: cancelledFollowUps || 0,
      diagnosticReports: diagnosticReportsCount || 0,
      procedures: proceduresCount || 0,
      finalizedDischarges: finalizedDischarges || 0,
      draftDischarges: draftDischarges || 0,
      smsSummary,
    };

    // --- 3. Trends (Daily Activity Series) ---
    const dailySeries = generateDailyDateSeries(
      dateRange.startDate,
      dateRange.endDate
    );

    // Fetch dates of patients, consultations, prescriptions in range for client-side binning
    let pDatesQuery = this.client
      .from("patients")
      .select("created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    if (chamberId) pDatesQuery = pDatesQuery.eq("chamber_id", chamberId);

    let cDatesQuery = this.client
      .from("consultations")
      .select("consultation_date")
      .gte("consultation_date", dateRange.startDate)
      .lte("consultation_date", dateRange.endDate);
    if (chamberId) cDatesQuery = cDatesQuery.eq("chamber_id", chamberId);

    let rxDatesQuery = this.client
      .from("prescriptions")
      .select("prescription_date")
      .eq("status", "finalized")
      .gte("prescription_date", dateRange.startDate)
      .lte("prescription_date", dateRange.endDate);
    if (chamberId) rxDatesQuery = rxDatesQuery.eq("chamber_id", chamberId);

    const [{ data: pDates }, { data: cDates }, { data: rxDates }] =
      await Promise.all([pDatesQuery, cDatesQuery, rxDatesQuery]);

    const pDayMap = new Map<string, number>();
    for (const row of pDates || []) {
      // Convert to Asia/Dhaka YMD
      const d = new Date(row.created_at);
      const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: CLINIC_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      pDayMap.set(ymd, (pDayMap.get(ymd) || 0) + 1);
    }

    const cDayMap = new Map<string, number>();
    for (const row of cDates || []) {
      const ymd = String(row.consultation_date);
      cDayMap.set(ymd, (cDayMap.get(ymd) || 0) + 1);
    }

    const rxDayMap = new Map<string, number>();
    for (const row of rxDates || []) {
      const ymd = String(row.prescription_date);
      rxDayMap.set(ymd, (rxDayMap.get(ymd) || 0) + 1);
    }

    const trends: DailyActivityTrend[] = dailySeries.map((s) => ({
      date: s.date,
      label: s.label,
      patients: pDayMap.get(s.date) || 0,
      consultations: cDayMap.get(s.date) || 0,
      prescriptions: rxDayMap.get(s.date) || 0,
    }));

    // --- 4. Chamber Activity Distribution ---
    const [{ data: chamberPatients }, { data: chamberConsultations }, { data: chamberFollowUps }] =
      await Promise.all([
        this.client.from("patients").select("chamber_id"),
        this.client.from("consultations").select("chamber_id"),
        this.client.from("follow_ups").select("chamber_id"),
      ]);

    const chamberDistribution: ChamberActivityStat[] = KNOWN_CHAMBERS.map((c) => {
      const pCount = (chamberPatients || []).filter(
        (p) => p.chamber_id === c.id || p.chamber_id === c.code
      ).length;
      const cCount = (chamberConsultations || []).filter(
        (con) => con.chamber_id === c.id || con.chamber_id === c.code
      ).length;
      const fCount = (chamberFollowUps || []).filter(
        (f) => f.chamber_id === c.id || f.chamber_id === c.code
      ).length;
      return {
        chamberId: c.id,
        code: c.patientIdPrefix,
        name: c.name,
        patientCount: pCount,
        consultationCount: cCount,
        followUpCount: fCount,
      };
    });

    const unassignedPatients = (chamberPatients || []).filter((p) => !p.chamber_id).length;
    if (unassignedPatients > 0) {
      chamberDistribution.push({
        chamberId: null,
        code: "UNASSIGNED",
        name: "Unassigned (Legacy)",
        patientCount: unassignedPatients,
        consultationCount: (chamberConsultations || []).filter((c) => !c.chamber_id).length,
        followUpCount: (chamberFollowUps || []).filter((f) => !f.chamber_id).length,
      });
    }

    // --- 5. Follow-Up Status Distribution ---
    const followUpDistribution: StatusCountItem[] = [
      {
        status: "scheduled",
        label: "Upcoming Scheduled",
        count: upcomingFollowUps || 0,
      },
      {
        status: "overdue",
        label: "Overdue Pending",
        count: overdueFollowUps || 0,
      },
      {
        status: "completed",
        label: "Completed Visits",
        count: completedFollowUps || 0,
      },
      {
        status: "cancelled",
        label: "Cancelled / Missed",
        count: cancelledFollowUps || 0,
      },
    ];

    // --- 6. Diagnostic Categories Distribution ---
    const diagCatQuery = chamberId
      ? this.client
          .from("diagnostic_reports")
          .select("category, patients!inner(chamber_id)")
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("diagnostic_reports")
          .select("category");

    const { data: diagCategoriesRows } = await diagCatQuery;

    const diagMap = new Map<string, number>();
    for (const row of (diagCategoriesRows || []) as DbRow[]) {
      const cat = String(row.category || "Other");
      diagMap.set(cat, (diagMap.get(cat) || 0) + 1);
    }
    const diagnosticCategories: CategoryCountItem[] = Array.from(diagMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // --- 7. Procedure Categories Distribution ---
    const procCatQuery = chamberId
      ? this.client
          .from("patient_procedures")
          .select("category, patients!inner(chamber_id)")
          .eq("patients.chamber_id", chamberId)
      : this.client
          .from("patient_procedures")
          .select("category");

    const { data: procCategoriesRows } = await procCatQuery;

    const procMap = new Map<string, number>();
    for (const row of (procCategoriesRows || []) as DbRow[]) {
      const cat = String(row.category || "Other");
      procMap.set(cat, (procMap.get(cat) || 0) + 1);
    }
    const procedureCategories: CategoryCountItem[] = Array.from(procMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const chamberLabel =
      params.chamberId && params.chamberId !== "all"
        ? this.getChamberName(params.chamberId)
        : "All Chambers";

    return {
      lifetime: {
        ...lifetime,
        totalFinalizedPrescriptions: lifetime.totalPrescriptions,
        totalCompletedFollowUps: range.completedFollowUps,
        chamberBreakdown: Object.fromEntries(
          chamberDistribution.map((c) => [c.name, c.patientCount])
        ),
      },
      range: {
        ...range,
        consultationsCount: range.consultations,
        prescriptionsCount: range.finalizedPrescriptions + range.draftPrescriptions,
        finalizedPrescriptionsCount: range.finalizedPrescriptions,
        draftPrescriptionsCount: range.draftPrescriptions,
        followUpsCount:
          range.upcomingFollowUps + range.completedFollowUps + range.overdueFollowUps,
        pendingFollowUpsCount: range.upcomingFollowUps,
        completedFollowUpsCount: range.completedFollowUps,
        overdueFollowUpsCount: range.overdueFollowUps,
        newPatientsCount: range.newPatients,
        diagnosticReportsCount: range.diagnosticReports,
        proceduresCount: range.procedures,
        dischargesCount: range.finalizedDischarges + range.draftDischarges,
        smsDeliveredCount: range.smsSummary.delivered,
        smsSentCount: range.smsSummary.sent,
      },
      trends,
      dailyTrends: trends,
      chamberDistribution,
      followUpDistribution,
      diagnosticCategories,
      procedureCategories,
      dateRange,
      chamberId: params.chamberId || "all",
      chamberLabel,
    };
  }

  public async getClinicalDashboardData(
    chamberId?: string,
    dateRange?: import("@/types/reports").DateRange
  ): Promise<ClinicalDashboardData> {
    return this.getClinicalDashboard({
      chamberId,
      preset: dateRange?.preset,
      customStart: dateRange?.startDate,
      customEnd: dateRange?.endDate,
    });
  }

  // --- Report 1: Patient Activity Report ---
  public async getPatientActivityReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PatientActivityReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate;
    const endDate = params.endDate || params.dateRange?.endDate;
    const { startIso, endIso } = toUtcTimestampRange(startDate, endDate);
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("patients")
      .select(
        "id, patient_id, name, gender, age, date_of_birth, phone, blood_group, chamber_id, created_at",
        { count: "exact" }
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `name.ilike.${term},patient_id.ilike.${term},phone.ilike.${term}`
      );
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch patient activity report: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const records: PatientActivityReportRow[] = (data || []).map((row) => ({
      id: String(row.id),
      patientId: String(row.patient_id),
      name: String(row.name),
      gender: String(row.gender || "Unknown"),
      age: Number(row.age) || 0,
      dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
      phone: row.phone ? String(row.phone) : "—",
      bloodGroup: row.blood_group ? String(row.blood_group) : "—",
      chamberId: row.chamber_id ? String(row.chamber_id) : null,
      chamberName: this.getChamberName(row.chamber_id),
      registeredDate: String(row.created_at).split("T")[0],
      createdAt: String(row.created_at),
    }));

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalNewPatients: total,
      },
    };
  }

  // --- Report 2: Consultation Report ---
  public async getConsultationReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<ConsultationReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("consultations")
      .select(
        "id, patient_id, patient_code, chamber_id, consultation_date, chief_complaint, diagnosis, advice, created_at, patients(name)",
        { count: "exact" }
      )
      .gte("consultation_date", startDate)
      .lte("consultation_date", endDate);

    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `patient_code.ilike.${term},chief_complaint.ilike.${term},diagnosis.ilike.${term}`
      );
    }

    query = query
      .order("consultation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch consultation report: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const records: ConsultationReportRow[] = (data || []).map((row: DbRow) => {
      const patientObj = extractPatient(row.patients);
      return {
        id: String(row.id),
        patientId: String(row.patient_id),
        patientCode: String(row.patient_code || "—"),
        patientName: patientObj?.name ? String(patientObj.name) : "Patient",
        chamberId: row.chamber_id ? String(row.chamber_id) : null,
        chamberName: this.getChamberName(row.chamber_id as string | null | undefined),
        consultationDate: String(row.consultation_date),
        chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : "—",
        diagnosis: row.diagnosis ? String(row.diagnosis) : "—",
        advice: row.advice ? String(row.advice) : "—",
        createdAt: String(row.created_at),
      };
    });

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalConsultations: total,
      },
    };
  }

  // --- Report 3: Prescription Report ---
  public async getPrescriptionReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PrescriptionReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("prescriptions")
      .select(
        "id, prescription_code, patient_id, chamber_id, prescription_date, status, archived_pdf_key, finalized_at, created_at, patients(patient_id, name), prescription_items(count)",
        { count: "exact" }
      )
      .gte("prescription_date", startDate)
      .lte("prescription_date", endDate);

    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(`prescription_code.ilike.${term}`);
    }

    query = query
      .order("prescription_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch prescription report: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const records: PrescriptionReportRow[] = (data || []).map((row: DbRow) => {
      const patientObj = extractPatient(row.patients);
      const rawItems = row.prescription_items as unknown[] | { count?: number } | undefined;
      const itemsCount = Array.isArray(rawItems)
        ? rawItems.length
        : (rawItems && typeof rawItems === "object" && "count" in rawItems
            ? Number(rawItems.count) || 0
            : 0);

      return {
        id: String(row.id),
        prescriptionCode: String(row.prescription_code),
        patientId: String(row.patient_id),
        patientCode: patientObj?.patient_id ? String(patientObj.patient_id) : "—",
        patientName: patientObj?.name ? String(patientObj.name) : "Patient",
        chamberId: row.chamber_id ? String(row.chamber_id) : null,
        chamberName: this.getChamberName(row.chamber_id as string | null | undefined),
        prescriptionDate: String(row.prescription_date),
        status: row.status as "draft" | "finalized",
        itemsCount,
        hasArchivedPdf: Boolean(row.archived_pdf_key),
        finalizedAt: row.finalized_at ? String(row.finalized_at) : null,
        createdAt: String(row.created_at),
      };
    });

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalPrescriptions: total,
      },
    };
  }

  // --- Report 4: Follow-up Report ---
  public async getFollowUpReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<FollowUpReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("follow_ups")
      .select(
        "id, patient_id, patient_code, chamber_id, scheduled_date, scheduled_time, reason, status, priority, clinical_outcome, outcome_notes, created_at, patients(name)",
        { count: "exact" }
      )
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate);

    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `patient_code.ilike.${term},reason.ilike.${term},clinical_outcome.ilike.${term}`
      );
    }

    query = query
      .order("scheduled_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch follow-up report: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const records: FollowUpReportRow[] = (data || []).map((row: DbRow) => {
      const patientObj = extractPatient(row.patients);

      return {
        id: String(row.id),
        patientId: String(row.patient_id),
        patientCode: String(row.patient_code),
        patientName: patientObj?.name ? String(patientObj.name) : "Patient",
        chamberId: row.chamber_id ? String(row.chamber_id) : null,
        chamberName: this.getChamberName(row.chamber_id as string | null | undefined),
        scheduledDate: String(row.scheduled_date),
        scheduledTime: row.scheduled_time ? String(row.scheduled_time) : null,
        reason: row.reason ? String(row.reason) : "—",
        status: row.status as "scheduled" | "completed" | "missed" | "cancelled" | "rescheduled",
        priority: (row.priority as "normal" | "high") || "normal",
        clinicalOutcome: row.clinical_outcome ? String(row.clinical_outcome) : null,
        outcomeNotes: row.outcome_notes ? String(row.outcome_notes) : null,
        createdAt: String(row.created_at),
      };
    });

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalFollowUps: total,
      },
    };
  }

  // --- Report 5: Diagnostic and Procedure Report ---
  public async getDiagnosticAndProcedureReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DiagnosticProcedureReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const diagQuery = this.client
      .from("diagnostic_reports")
      .select(
        "id, patient_id, test_name, category, test_date, diagnostic_center, doctor_notes, drive_url, created_at, patients(patient_id, name, chamber_id)"
      )
      .gte("test_date", startDate)
      .lte("test_date", endDate);

    const procQuery = this.client
      .from("patient_procedures")
      .select(
        "id, patient_id, procedure_name, category, procedure_date, hospital_facility, clinical_indication, doctor_notes, drive_url, created_at, patients(patient_id, name, chamber_id)"
      )
      .gte("procedure_date", startDate)
      .lte("procedure_date", endDate);

    const [{ data: diags, error: dErr }, { data: procs, error: pErr }] =
      await Promise.all([diagQuery, procQuery]);

    if (dErr || pErr) {
      throw new Error(`Failed to fetch diagnostic/procedure report: ${(dErr || pErr)?.message}`);
    }

    let combined: DiagnosticProcedureReportRow[] = [];

    for (const d of (diags || []) as DbRow[]) {
      const p = extractPatient(d.patients);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamber_id !== params.chamberId) continue;
      }
      combined.push({
        id: String(d.id),
        itemType: "diagnostic",
        patientId: String(d.patient_id),
        patientCode: p?.patient_id ? String(p.patient_id) : "—",
        patientName: p?.name ? String(p.name) : "Patient",
        title: String(d.test_name),
        category: String(d.category),
        activityDate: String(d.test_date),
        facilityOrCenter: d.diagnostic_center ? String(d.diagnostic_center) : null,
        details: d.doctor_notes ? String(d.doctor_notes) : null,
        driveUrl: d.drive_url ? String(d.drive_url) : null,
        createdAt: String(d.created_at),
      });
    }

    for (const pr of (procs || []) as DbRow[]) {
      const p = extractPatient(pr.patients);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamber_id !== params.chamberId) continue;
      }
      combined.push({
        id: String(pr.id),
        itemType: "procedure",
        patientId: String(pr.patient_id),
        patientCode: p?.patient_id ? String(p.patient_id) : "—",
        patientName: p?.name ? String(p.name) : "Patient",
        title: String(pr.procedure_name),
        category: String(pr.category),
        activityDate: String(pr.procedure_date),
        facilityOrCenter: pr.hospital_facility ? String(pr.hospital_facility) : null,
        details: pr.doctor_notes ? String(pr.doctor_notes) : (pr.clinical_indication ? String(pr.clinical_indication) : null),
        driveUrl: pr.drive_url ? String(pr.drive_url) : null,
        createdAt: String(pr.created_at),
      });
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      combined = combined.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.patientCode.toLowerCase().includes(q) ||
          item.patientName.toLowerCase().includes(q)
      );
    }

    combined.sort((a, b) => b.activityDate.localeCompare(a.activityDate));

    const total = combined.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const records = combined.slice(offset, offset + pageSize);

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalItems: total,
        diagnosticCount: combined.filter((i) => i.itemType === "diagnostic").length,
        procedureCount: combined.filter((i) => i.itemType === "procedure").length,
      },
    };
  }

  public async getDiagnosticProcedureReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DiagnosticProcedureReportRow>> {
    return this.getDiagnosticAndProcedureReport(params);
  }

  // --- Report 6: Patient Discharge Report ---
  public async getDischargeReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DischargeReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const query = this.client
      .from("patient_discharges")
      .select(
        "id, patient_id, discharge_date, discharge_time, status, condition_at_discharge, final_diagnosis, clinical_reason, recommended_follow_up_date, finalized_at, created_at, patients(patient_id, name, chamber_id)"
      )
      .gte("discharge_date", startDate)
      .lte("discharge_date", endDate);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch discharge report: ${error.message}`);
    }

    let items: DischargeReportRow[] = [];

    for (const d of (data || []) as DbRow[]) {
      const p = extractPatient(d.patients);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamber_id !== params.chamberId) continue;
      }
      items.push({
        id: String(d.id),
        patientId: String(d.patient_id),
        patientCode: p?.patient_id ? String(p.patient_id) : "—",
        patientName: p?.name ? String(p.name) : "Patient",
        dischargeDate: String(d.discharge_date),
        dischargeTime: d.discharge_time ? String(d.discharge_time) : null,
        status: d.status as "draft" | "finalized",
        conditionAtDischarge: String(d.condition_at_discharge),
        finalDiagnosis: String(d.final_diagnosis),
        clinicalReason: String(d.clinical_reason),
        recommendedFollowUpDate: d.recommended_follow_up_date
          ? String(d.recommended_follow_up_date)
          : null,
        finalizedAt: d.finalized_at ? String(d.finalized_at) : null,
        createdAt: String(d.created_at),
      });
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter(
        (d) =>
          d.finalDiagnosis.toLowerCase().includes(q) ||
          d.conditionAtDischarge.toLowerCase().includes(q) ||
          d.patientName.toLowerCase().includes(q) ||
          d.patientCode.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.dischargeDate.localeCompare(a.dischargeDate));

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const records = items.slice(offset, offset + pageSize);

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalDischarges: total,
        finalizedDischarges: items.filter((d) => d.status === "finalized").length,
      },
    };
  }

  // --- Report 7: SMS Delivery Report ---
  public async getSmsDeliveryReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<SmsDeliveryReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate;
    const endDate = params.endDate || params.dateRange?.endDate;
    const { startIso, endIso } = toUtcTimestampRange(startDate, endDate);
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const query = this.client
      .from("sms_reminders")
      .select(
        "id, follow_up_id, patient_id, recipient_phone_masked, reminder_type, scheduled_for, status, delivery_status, retry_count, sent_at, failure_reason, created_at, patients(patient_id, name, chamber_id)"
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch SMS delivery report: ${error.message}`);
    }

    let items: SmsDeliveryReportRow[] = [];

    for (const s of (data || []) as DbRow[]) {
      const p = extractPatient(s.patients);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamber_id !== params.chamberId) continue;
      }
      items.push({
        id: String(s.id),
        followUpId: s.follow_up_id ? String(s.follow_up_id) : null,
        patientId: s.patient_id ? String(s.patient_id) : null,
        patientCode: p?.patient_id ? String(p.patient_id) : "—",
        patientName: p?.name ? String(p.name) : "Patient",
        recipientPhoneMasked: String(s.recipient_phone_masked || "—"),
        reminderType: String(s.reminder_type),
        scheduledFor: String(s.scheduled_for),
        status: String(s.status),
        deliveryStatus: String(s.delivery_status || s.status),
        retryCount: Number(s.retry_count) || 0,
        sentAt: s.sent_at ? String(s.sent_at) : null,
        failureReason: s.failure_reason ? String(s.failure_reason) : null,
        createdAt: String(s.created_at),
      });
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter(
        (s) =>
          s.deliveryStatus.toLowerCase().includes(q) ||
          s.recipientPhoneMasked.includes(q) ||
          s.patientName.toLowerCase().includes(q) ||
          s.patientCode.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const records = items.slice(offset, offset + pageSize);

    return {
      records,
      data: records,
      total,
      totalCount: total,
      page,
      pageSize,
      totalPages,
      summaryStats: {
        totalReminders: total,
        delivered: items.filter((s) => s.deliveryStatus === "delivered").length,
        sent: items.filter((s) => s.deliveryStatus === "sent").length,
        failed: items.filter((s) => s.deliveryStatus === "failed").length,
      },
    };
  }
}
