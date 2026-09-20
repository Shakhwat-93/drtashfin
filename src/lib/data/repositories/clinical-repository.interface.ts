import {
  FollowUp,
  Operation,
  ClinicalActivity,
  DashboardMetrics,
} from "@/types/clinical";

export interface IClinicalRepository {
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getTodayFollowUps(): Promise<FollowUp[]>;
  getTodayOperations(): Promise<Operation[]>;
  getRecentActivities(limit?: number): Promise<ClinicalActivity[]>;
}
