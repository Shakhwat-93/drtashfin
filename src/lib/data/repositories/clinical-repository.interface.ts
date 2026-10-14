import {
  FollowUp,
  Operation,
  ClinicalActivity,
  DashboardMetrics,
} from "@/types/clinical";

export interface IClinicalRepository {
  getDashboardMetrics(chamberId?: string): Promise<DashboardMetrics>;
  getTodayFollowUps(chamberId?: string): Promise<FollowUp[]>;
  getTodayOperations(chamberId?: string): Promise<Operation[]>;
  getRecentActivities(limit?: number, chamberId?: string): Promise<ClinicalActivity[]>;
}
