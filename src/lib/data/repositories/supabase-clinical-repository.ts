import { IClinicalRepository } from "./clinical-repository.interface";
import {
  FollowUp,
  Operation,
  ClinicalActivity,
  DashboardMetrics,
} from "@/types/clinical";
import { supabase } from "@/lib/supabase/client";

export class SupabaseClinicalRepository implements IClinicalRepository {
  public async getDashboardMetrics(chamberId?: string): Promise<DashboardMetrics> {
    const todayStr = new Date().toISOString().split("T")[0];

    // Consultations Conducted Today
    let consultQuery = supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("consultation_date", todayStr);

    if (chamberId) {
      consultQuery = consultQuery.eq("chamber_id", chamberId);
    }
    const { count: todayConsultations } = await consultQuery;

    // Follow-ups Scheduled for Today from follow_ups table
    let followUpQuery = supabase
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", todayStr);

    if (chamberId) {
      followUpQuery = followUpQuery.eq("chamber_id", chamberId);
    }
    const { count: todayFollowUps } = await followUpQuery;

    // Diagnostic Reports Count for Today
    let diagQuery = supabase
      .from("diagnostic_reports")
      .select("*", { count: "exact", head: true })
      .eq("test_date", todayStr);

    if (chamberId) {
      diagQuery = diagQuery.eq("chamber_id", chamberId);
    }
    const { count: todayDiagnostics } = await diagQuery;

    // Operations / Procedures Scheduled for Today
    let procQuery = supabase
      .from("patient_procedures")
      .select("*", { count: "exact", head: true })
      .eq("procedure_date", todayStr);

    if (chamberId) {
      procQuery = procQuery.eq("chamber_id", chamberId);
    }
    const { count: todayProcedures } = await procQuery;

    return {
      todayPatientsCount: todayConsultations ?? 0,
      todayFollowUpsCount: todayFollowUps ?? 0,
      pendingInvestigationsCount: todayDiagnostics ?? 0,
      todayOperationsCount: todayProcedures ?? 0,
    };
  }

  public async getTodayFollowUps(chamberId?: string): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("consultations")
      .select("id, patient_id, patient_code, next_follow_up, advice, created_at")
      .gte("next_follow_up", todayStr)
      .order("next_follow_up", { ascending: true })
      .limit(10);

    if (chamberId) {
      query = query.eq("chamber_id", chamberId);
    }

    const { data } = await query;

    return (data || []).map((row) => ({
      id: String(row.id),
      patientId: String(row.patient_code || row.patient_id),
      patientName: String(row.patient_code || "Patient"),
      scheduledDate: String(row.next_follow_up),
      scheduledTime: "10:00 AM",
      reason: String(row.advice || "Follow-up consultation"),
      room: "Room 102",
      status: "scheduled",
      priority: "normal",
      createdAt: String(row.created_at),
    }));
  }

  public async getTodayOperations(_chamberId?: string): Promise<Operation[]> {
    return [];
  }

  public async getRecentActivities(limit = 5, chamberId?: string): Promise<ClinicalActivity[]> {
    let query = supabase
      .from("consultations")
      .select("id, patient_code, consultation_date, chief_complaint, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (chamberId) {
      query = query.eq("chamber_id", chamberId);
    }

    const { data } = await query;

    return (data || []).map((row) => ({
      id: String(row.id),
      title: `Consultation: ${row.patient_code || "Patient"}`,
      description: row.chief_complaint
        ? `Chief Complaint: ${row.chief_complaint}`
        : "Clinical consultation recorded",
      timestamp: String(row.created_at),
      category: "visit",
    }));
  }
}
