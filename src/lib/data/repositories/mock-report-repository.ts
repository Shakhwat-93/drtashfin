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
import { MockStorage } from "../mock/mock-storage";
import { resolveDateRange, generateDailyDateSeries, toUtcTimestampRange } from "@/lib/reports/date-range-utils";
import { getClinicToday, CLINIC_TIMEZONE, parseYMD } from "@/lib/date-utils";
import { KNOWN_CHAMBERS } from "@/types/chamber";
import { Patient } from "@/types/patient";
import { Consultation } from "@/types/consultation";
import { Prescription } from "@/types/prescription";
import { FollowUp } from "@/types/follow-up";
import { DiagnosticReport } from "@/types/diagnostic-report";
import { PatientProcedure } from "@/types/procedure";
import { PatientDischarge } from "@/types/discharge";
import { SmsReminder } from "@/types/sms";

export class MockReportRepository implements IReportRepository {
  private getPatients(): Patient[] {
    return MockStorage.get<Patient[]>("patients_list") || [];
  }

  private getConsultations(): Consultation[] {
    return MockStorage.get<Consultation[]>("consultations_list") || [];
  }

  private getPrescriptions(): Prescription[] {
    return MockStorage.get<Prescription[]>("prescriptions_list") || [];
  }

  private getFollowUps(): FollowUp[] {
    return MockStorage.get<FollowUp[]>("follow_ups_list") || [];
  }

  private getDiagnostics(): DiagnosticReport[] {
    return MockStorage.get<DiagnosticReport[]>("diagnostic_reports_list") || [];
  }

  private getProcedures(): PatientProcedure[] {
    return MockStorage.get<PatientProcedure[]>("patient_procedures_list") || [];
  }

  private getDischarges(): PatientDischarge[] {
    return MockStorage.get<PatientDischarge[]>("patient_discharges_list") || [];
  }

  private getSmsReminders(): SmsReminder[] {
    return MockStorage.get<SmsReminder[]>("sms_reminders_list") || [];
  }

  private getChamberName(chamberId?: string | null): string {
    if (!chamberId) return "Unassigned (Legacy)";
    const found = KNOWN_CHAMBERS.find((c) => c.id === chamberId || c.code === chamberId);
    return found ? found.name : "Other Chamber";
  }

  private filterByChamber<T extends { chamberId?: string | null }>(
    items: T[],
    chamberId?: string
  ): T[] {
    if (!chamberId || chamberId === "all") return items;
    return items.filter((item) => item.chamberId === chamberId);
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
    const { startIso, endIso } = toUtcTimestampRange(dateRange.startDate, dateRange.endDate);
    const todayYmd = getClinicToday(CLINIC_TIMEZONE);

    const allPatients = this.getPatients();
    const allConsultations = this.getConsultations();
    const allPrescriptions = this.getPrescriptions();
    const allFollowUps = this.getFollowUps();
    const allDiagnostics = this.getDiagnostics();
    const allProcedures = this.getProcedures();
    const allDischarges = this.getDischarges();
    const allSms = this.getSmsReminders();

    // Chamber-filtered subsets
    const chamberPatients = this.filterByChamber(allPatients, params.chamberId);
    const chamberConsultations = this.filterByChamber(allConsultations, params.chamberId);
    const chamberPrescriptions = this.filterByChamber(allPrescriptions, params.chamberId);
    const chamberFollowUps = this.filterByChamber(allFollowUps, params.chamberId);

    // Patients in chamber for secondary mapping
    const chamberPatientIds = new Set(chamberPatients.map((p) => p.id));
    const chamberDiagnostics =
      params.chamberId && params.chamberId !== "all"
        ? allDiagnostics.filter((d) => chamberPatientIds.has(d.patientId))
        : allDiagnostics;
    const chamberProcedures =
      params.chamberId && params.chamberId !== "all"
        ? allProcedures.filter((p) => chamberPatientIds.has(p.patientId))
        : allProcedures;
    const chamberDischarges =
      params.chamberId && params.chamberId !== "all"
        ? allDischarges.filter((d) => chamberPatientIds.has(d.patientId))
        : allDischarges;
    const chamberSms =
      params.chamberId && params.chamberId !== "all"
        ? allSms.filter((s) => s.patientId && chamberPatientIds.has(s.patientId))
        : allSms;

    // 1. Lifetime Totals
    const lifetime = {
      totalPatients: chamberPatients.length,
      totalConsultations: chamberConsultations.length,
      totalPrescriptions: chamberPrescriptions.filter((p) => p.status === "finalized").length,
      totalProcedures: chamberProcedures.length,
      totalDischarges: chamberDischarges.filter((d) => d.status === "finalized").length,
      totalDiagnosticReports: chamberDiagnostics.length,
    };

    // 2. Date-Range Activity Metrics
    const newPatients = chamberPatients.filter(
      (p) => p.createdAt >= startIso && p.createdAt <= endIso
    ).length;

    const consultationsInRange = chamberConsultations.filter(
      (c) => c.consultationDate >= dateRange.startDate && c.consultationDate <= dateRange.endDate
    ).length;

    const finalizedPrescriptions = chamberPrescriptions.filter(
      (p) =>
        p.status === "finalized" &&
        ((p.prescriptionDate &&
          p.prescriptionDate >= dateRange.startDate &&
          p.prescriptionDate <= dateRange.endDate) ||
          (p.finalizedAt && p.finalizedAt >= startIso && p.finalizedAt <= endIso))
    ).length;

    const draftPrescriptions = chamberPrescriptions.filter(
      (p) => p.status === "draft" && p.createdAt >= startIso && p.createdAt <= endIso
    ).length;

    // Follow-ups
    const upcomingFollowUps = chamberFollowUps.filter(
      (f) => f.scheduledDate >= todayYmd && f.status === "scheduled"
    ).length;

    const overdueFollowUps = chamberFollowUps.filter(
      (f) => f.scheduledDate < todayYmd && f.status === "scheduled"
    ).length;

    const completedFollowUps = chamberFollowUps.filter(
      (f) =>
        f.status === "completed" &&
        f.scheduledDate >= dateRange.startDate &&
        f.scheduledDate <= dateRange.endDate
    ).length;

    const cancelledFollowUps = chamberFollowUps.filter(
      (f) =>
        (f.status === "cancelled" || (f.status as string) === "missed") &&
        f.scheduledDate >= dateRange.startDate &&
        f.scheduledDate <= dateRange.endDate
    ).length;

    const diagnosticReportsInRange = chamberDiagnostics.filter(
      (d) =>
        d.testDate &&
        d.testDate >= dateRange.startDate &&
        d.testDate <= dateRange.endDate
    ).length;

    const proceduresInRange = chamberProcedures.filter(
      (p) =>
        p.procedureDate &&
        p.procedureDate >= dateRange.startDate &&
        p.procedureDate <= dateRange.endDate
    ).length;

    const finalizedDischargesInRange = chamberDischarges.filter(
      (d) =>
        d.status === "finalized" &&
        d.dischargeDate >= dateRange.startDate &&
        d.dischargeDate <= dateRange.endDate
    ).length;

    const draftDischarges = chamberDischarges.filter(
      (d) => d.status === "draft" && d.createdAt >= startIso && d.createdAt <= endIso
    ).length;

    // SMS Summary
    const smsInRange = chamberSms.filter(
      (s) => s.createdAt >= startIso && s.createdAt <= endIso
    );
    const smsSummary = {
      pending: smsInRange.filter((s) => s.deliveryStatus === "pending").length,
      sent: smsInRange.filter((s) => s.deliveryStatus === "sent").length,
      delivered: smsInRange.filter((s) => s.deliveryStatus === "delivered").length,
      failed: smsInRange.filter((s) => s.deliveryStatus === "failed").length,
      total: smsInRange.length,
    };

    const range = {
      newPatients,
      consultations: consultationsInRange,
      finalizedPrescriptions,
      draftPrescriptions,
      upcomingFollowUps,
      overdueFollowUps,
      completedFollowUps,
      cancelledFollowUps,
      diagnosticReports: diagnosticReportsInRange,
      procedures: proceduresInRange,
      finalizedDischarges: finalizedDischargesInRange,
      draftDischarges,
      smsSummary,
    };

    // 3. Trends (Daily buckets for charts)
    const dailySeries = generateDailyDateSeries(dateRange.startDate, dateRange.endDate);
    const trends: DailyActivityTrend[] = dailySeries.map((series) => {
      const dayStart = `${series.date}T00:00:00.000+06:00`;
      const dayEnd = `${series.date}T23:59:59.999+06:00`;
      const dayStartIso = new Date(dayStart).toISOString();
      const dayEndIso = new Date(dayEnd).toISOString();

      const dayPatients = chamberPatients.filter(
        (p) => p.createdAt >= dayStartIso && p.createdAt <= dayEndIso
      ).length;

      const dayConsultations = chamberConsultations.filter(
        (c) => c.consultationDate === series.date
      ).length;

      const dayPrescriptions = chamberPrescriptions.filter(
        (p) =>
          p.status === "finalized" &&
          ((p.prescriptionDate && p.prescriptionDate === series.date) ||
            (p.finalizedAt && p.finalizedAt >= dayStartIso && p.finalizedAt <= dayEndIso))
      ).length;

      return {
        date: series.date,
        label: series.label,
        patients: dayPatients,
        consultations: dayConsultations,
        prescriptions: dayPrescriptions,
      };
    });

    // 4. Chamber Distribution
    const chamberDistribution: ChamberActivityStat[] = KNOWN_CHAMBERS.map((c) => {
      const pCount = allPatients.filter((p) => p.chamberId === c.id || p.chamberId === c.code).length;
      const cCount = allConsultations.filter((con) => con.chamberId === c.id || con.chamberId === c.code).length;
      const fCount = allFollowUps.filter((f) => f.chamberId === c.id || f.chamberId === c.code).length;
      return {
        chamberId: c.id,
        code: c.patientIdPrefix,
        name: c.name,
        patientCount: pCount,
        consultationCount: cCount,
        followUpCount: fCount,
      };
    });

    // Also include legacy unassigned if any
    const legacyPatients = allPatients.filter((p) => !p.chamberId).length;
    if (legacyPatients > 0) {
      chamberDistribution.push({
        chamberId: null,
        code: "UNASSIGNED",
        name: "Unassigned (Legacy)",
        patientCount: legacyPatients,
        consultationCount: allConsultations.filter((c) => !c.chamberId).length,
        followUpCount: allFollowUps.filter((f) => !f.chamberId).length,
      });
    }

    // 5. Follow-up distribution
    const followUpDistribution: StatusCountItem[] = [
      {
        status: "scheduled",
        label: "Upcoming Scheduled",
        count: chamberFollowUps.filter((f) => f.status === "scheduled" && f.scheduledDate >= todayYmd).length,
      },
      {
        status: "overdue",
        label: "Overdue Pending",
        count: chamberFollowUps.filter((f) => f.status === "scheduled" && f.scheduledDate < todayYmd).length,
      },
      {
        status: "completed",
        label: "Completed Visits",
        count: chamberFollowUps.filter((f) => f.status === "completed").length,
      },
      {
        status: "cancelled",
        label: "Cancelled / Missed",
        count: chamberFollowUps.filter((f) => f.status === "cancelled" || (f.status as string) === "missed").length,
      },
    ];

    // 6. Diagnostic Categories
    const diagMap = new Map<string, number>();
    for (const d of chamberDiagnostics) {
      const cat = d.category || "Other";
      diagMap.set(cat, (diagMap.get(cat) || 0) + 1);
    }
    const diagnosticCategories: CategoryCountItem[] = Array.from(diagMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // 7. Procedure Categories
    const procMap = new Map<string, number>();
    for (const p of chamberProcedures) {
      const cat = p.category || "Other";
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
        totalCompletedFollowUps: allFollowUps.filter((f) => f.status === "completed").length,
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

  // --- Report 1: Patient Activity ---
  public async getPatientActivityReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PatientActivityReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate;
    const endDate = params.endDate || params.dateRange?.endDate;
    const { startIso, endIso } = toUtcTimestampRange(startDate, endDate);
    let items = this.getPatients();

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((p) => p.chamberId === params.chamberId);
    }

    // Filter by registration date
    items = items.filter((p) => p.createdAt >= startIso && p.createdAt <= endIso);

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q))
      );
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: PatientActivityReportRow[] = paginated.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      gender: p.gender || "Unknown",
      age: p.age || 0,
      dateOfBirth: p.dateOfBirth,
      phone: p.phone || "—",
      bloodGroup: p.bloodGroup || "—",
      chamberId: p.chamberId || null,
      chamberName: this.getChamberName(p.chamberId),
      registeredDate: p.createdAt.split("T")[0],
      createdAt: p.createdAt,
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

  // --- Report 2: Consultations ---
  public async getConsultationReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<ConsultationReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    let items = this.getConsultations();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((c) => c.chamberId === params.chamberId);
    }

    items = items.filter(
      (c) => c.consultationDate >= startDate && c.consultationDate <= endDate
    );

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter((c) => {
        const p = patientMap.get(c.patientId);
        const pCode = p?.patientId || c.patientId;
        const diag = c.provisionalDiagnosis || c.differentialDiagnosis || "";
        return (
          pCode.toLowerCase().includes(q) ||
          (p && p.name.toLowerCase().includes(q)) ||
          (c.chiefComplaint && c.chiefComplaint.toLowerCase().includes(q)) ||
          diag.toLowerCase().includes(q)
        );
      });
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: ConsultationReportRow[] = paginated.map((c) => {
      const p = patientMap.get(c.patientId);
      return {
        id: c.id,
        patientId: c.patientId,
        patientCode: p?.patientId || c.patientId,
        patientName: p ? p.name : "Patient",
        chamberId: c.chamberId || null,
        chamberName: this.getChamberName(c.chamberId),
        consultationDate: c.consultationDate,
        chiefComplaint: c.chiefComplaint || "—",
        diagnosis: c.provisionalDiagnosis || c.differentialDiagnosis || "—",
        advice: c.advice || "—",
        createdAt: c.createdAt,
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

  // --- Report 3: Prescriptions ---
  public async getPrescriptionReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<PrescriptionReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    let items = this.getPrescriptions();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((p) => p.chamberId === params.chamberId);
    }

    items = items.filter((p) => {
      const d = p.prescriptionDate || p.createdAt.split("T")[0];
      return d >= startDate && d <= endDate;
    });

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter((p) => {
        const pat = patientMap.get(p.patientId);
        return (
          p.prescriptionCode.toLowerCase().includes(q) ||
          (pat && pat.name.toLowerCase().includes(q)) ||
          (pat && pat.patientId.toLowerCase().includes(q))
        );
      });
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: PrescriptionReportRow[] = paginated.map((p) => {
      const pat = patientMap.get(p.patientId);
      return {
        id: p.id,
        prescriptionCode: p.prescriptionCode,
        patientId: p.patientId,
        patientCode: pat ? pat.patientId : "—",
        patientName: pat ? pat.name : "Patient",
        chamberId: p.chamberId || null,
        chamberName: this.getChamberName(p.chamberId),
        prescriptionDate: p.prescriptionDate || p.createdAt.split("T")[0],
        status: p.status,
        itemsCount: (p.items || []).length,
        hasArchivedPdf: Boolean(p.archivedPdfKey),
        finalizedAt: p.finalizedAt || null,
        createdAt: p.createdAt,
      };
    });

    const finalizedCount = items.filter((p) => p.status === "finalized").length;
    const draftCount = items.filter((p) => p.status === "draft").length;

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
        finalizedCount,
        draftCount,
      },
    };
  }

  // --- Report 4: Follow-ups ---
  public async getFollowUpReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<FollowUpReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    let items = this.getFollowUps();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((f) => f.chamberId === params.chamberId);
    }

    items = items.filter(
      (f) => f.scheduledDate >= startDate && f.scheduledDate <= endDate
    );

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter((f) => {
        const pat = patientMap.get(f.patientId);
        const pCode = f.patientCode || pat?.patientId || f.patientId || "";
        return (
          pCode.toLowerCase().includes(q) ||
          (pat && pat.name.toLowerCase().includes(q)) ||
          (f.reason && f.reason.toLowerCase().includes(q)) ||
          (f.clinicalOutcome && f.clinicalOutcome.toLowerCase().includes(q))
        );
      });
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: FollowUpReportRow[] = paginated.map((f) => {
      const pat = patientMap.get(f.patientId);
      return {
        id: f.id,
        patientId: f.patientId,
        patientCode: f.patientCode || pat?.patientId || f.patientId || "—",
        patientName: pat ? pat.name : "Patient",
        chamberId: f.chamberId || null,
        chamberName: this.getChamberName(f.chamberId),
        scheduledDate: f.scheduledDate,
        scheduledTime: f.scheduledTime || null,
        reason: f.reason || "—",
        status: f.status,
        priority: f.priority || "normal",
        clinicalOutcome: f.clinicalOutcome || null,
        outcomeNotes: f.outcomeNotes || null,
        createdAt: f.createdAt,
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
        completed: items.filter((f) => f.status === "completed").length,
        scheduled: items.filter((f) => f.status === "scheduled").length,
      },
    };
  }

  // --- Report 5: Diagnostic and Procedure Report ---
  public async getDiagnosticAndProcedureReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DiagnosticProcedureReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    const diagnostics = this.getDiagnostics();
    const procedures = this.getProcedures();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    let combined: DiagnosticProcedureReportRow[] = [];

    // Add diagnostics
    for (const d of diagnostics) {
      const p = patientMap.get(d.patientId);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamberId !== params.chamberId) continue;
      }
      if (d.testDate && d.testDate >= startDate && d.testDate <= endDate) {
        combined.push({
          id: d.id,
          itemType: "diagnostic",
          patientId: d.patientId,
          patientCode: p ? p.patientId : "—",
          patientName: p ? p.name : "Patient",
          title: d.testName,
          category: d.category,
          activityDate: d.testDate,
          facilityOrCenter: d.diagnosticCenter || null,
          details: d.doctorNotes || null,
          driveUrl: d.driveUrl || null,
          createdAt: d.createdAt,
        });
      }
    }

    // Add procedures
    for (const pr of procedures) {
      const p = patientMap.get(pr.patientId);
      if (params.chamberId && params.chamberId !== "all") {
        if (!p || p.chamberId !== params.chamberId) continue;
      }
      if (pr.procedureDate && pr.procedureDate >= startDate && pr.procedureDate <= endDate) {
        combined.push({
          id: pr.id,
          itemType: "procedure",
          patientId: pr.patientId,
          patientCode: p ? p.patientId : "—",
          patientName: p ? p.name : "Patient",
          title: pr.procedureName,
          category: pr.category,
          activityDate: pr.procedureDate,
          facilityOrCenter: pr.hospitalFacility || null,
          details: pr.doctorNotes || pr.clinicalIndication || null,
          driveUrl: pr.driveUrl || null,
          createdAt: pr.createdAt,
        });
      }
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      combined = combined.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.patientCode.toLowerCase().includes(q) ||
          item.patientName.toLowerCase().includes(q) ||
          (item.facilityOrCenter && item.facilityOrCenter.toLowerCase().includes(q))
      );
    }

    combined.sort((a, b) => b.activityDate.localeCompare(a.activityDate));

    const total = combined.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
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

  // --- Report 6: Discharges ---
  public async getDischargeReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<DischargeReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate || "1900-01-01";
    const endDate = params.endDate || params.dateRange?.endDate || "2100-12-31";
    let items = this.getDischarges();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((d) => {
        const p = patientMap.get(d.patientId);
        return p && p.chamberId === params.chamberId;
      });
    }

    items = items.filter(
      (d) => d.dischargeDate >= startDate && d.dischargeDate <= endDate
    );

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter((d) => {
        const p = patientMap.get(d.patientId);
        return (
          d.finalDiagnosis.toLowerCase().includes(q) ||
          d.conditionAtDischarge.toLowerCase().includes(q) ||
          (p && p.name.toLowerCase().includes(q)) ||
          (p && p.patientId.toLowerCase().includes(q))
        );
      });
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: DischargeReportRow[] = paginated.map((d) => {
      const p = patientMap.get(d.patientId);
      return {
        id: d.id,
        patientId: d.patientId,
        patientCode: p ? p.patientId : "—",
        patientName: p ? p.name : "Patient",
        dischargeDate: d.dischargeDate,
        dischargeTime: d.dischargeTime || null,
        status: d.status,
        conditionAtDischarge: d.conditionAtDischarge,
        finalDiagnosis: d.finalDiagnosis,
        clinicalReason: d.clinicalReason,
        recommendedFollowUpDate: d.recommendedFollowUpDate || null,
        finalizedAt: d.finalizedAt || null,
        createdAt: d.createdAt,
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
        totalDischarges: total,
        finalizedDischarges: items.filter((d) => d.status === "finalized").length,
      },
    };
  }

  // --- Report 7: SMS Delivery ---
  public async getSmsDeliveryReport(
    params: ReportQueryParams
  ): Promise<PaginatedReportResult<SmsDeliveryReportRow>> {
    const startDate = params.startDate || params.dateRange?.startDate;
    const endDate = params.endDate || params.dateRange?.endDate;
    const { startIso, endIso } = toUtcTimestampRange(startDate, endDate);
    let items = this.getSmsReminders();
    const patients = this.getPatients();
    const patientMap = new Map(patients.map((p) => [p.id, p]));

    if (params.chamberId && params.chamberId !== "all") {
      items = items.filter((s) => {
        if (!s.patientId) return false;
        const p = patientMap.get(s.patientId);
        return p && p.chamberId === params.chamberId;
      });
    }

    items = items.filter((s) => s.createdAt >= startIso && s.createdAt <= endIso);

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      items = items.filter((s) => {
        const p = s.patientId ? patientMap.get(s.patientId) : null;
        return (
          (s.deliveryStatus || "").toLowerCase().includes(q) ||
          s.recipientPhoneMasked.includes(q) ||
          (p && p.name.toLowerCase().includes(q)) ||
          (p && p.patientId.toLowerCase().includes(q))
        );
      });
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    const paginated = items.slice(offset, offset + pageSize);

    const records: SmsDeliveryReportRow[] = paginated.map((s) => {
      const p = s.patientId ? patientMap.get(s.patientId) : null;
      return {
        id: s.id,
        followUpId: s.followUpId || null,
        patientId: s.patientId || null,
        patientCode: p ? p.patientId : "—",
        patientName: p ? p.name : "Patient",
        recipientPhoneMasked: s.recipientPhoneMasked,
        reminderType: s.reminderType,
        scheduledFor: s.scheduledFor,
        status: s.status,
        deliveryStatus: s.deliveryStatus || s.status || "pending",
        retryCount: s.retryCount ?? 0,
        sentAt: s.sentAt || null,
        failureReason: s.failureReason || null,
        createdAt: s.createdAt,
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
        totalReminders: total,
        delivered: items.filter((s) => s.deliveryStatus === "delivered").length,
        sent: items.filter((s) => s.deliveryStatus === "sent").length,
        failed: items.filter((s) => s.deliveryStatus === "failed").length,
      },
    };
  }
}
