import { IClinicalRepository } from "./clinical-repository.interface";
import {
  FollowUp,
  Operation,
  ClinicalActivity,
  DashboardMetrics,
} from "@/types/clinical";
import { supabase } from "@/lib/supabase/client";

export class SupabaseClinicalRepository implements IClinicalRepository {
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const todayStr = new Date().toISOString().split("T")[0];

    // Consultations Conducted Today
    const { count: todayConsultations } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("consultation_date", todayStr);

    // Follow-ups Scheduled for Today
    const { count: todayFollowUps } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("next_follow_up", todayStr);

    return {
      todayPatientsCount: todayConsultations ?? 0,
      todayFollowUpsCount: todayFollowUps ?? 0,
      pendingInvestigationsCount: 0,
      todayOperationsCount: 0,
    };
  }

  public async getTodayFollowUps(): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("consultations")
      .select("id, patient_id, patient_code, next_follow_up, advice, created_at")
      .gte("next_follow_up", todayStr)
      .order("next_follow_up", { ascending: true })
      .limit(10);

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

  public async getTodayOperations(): Promise<Operation[]> {
    return [];
  }

  public async getRecentActivities(limit = 5): Promise<ClinicalActivity[]> {
    const { data } = await supabase
      .from("consultations")
      .select("id, patient_code, consultation_date, chief_complaint, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

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
