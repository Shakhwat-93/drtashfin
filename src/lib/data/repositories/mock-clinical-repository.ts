import { IClinicalRepository } from "./clinical-repository.interface";
import {
  FollowUp,
  Operation,
  ClinicalActivity,
  DashboardMetrics,
} from "@/types/clinical";
import { MockStorage } from "../mock/mock-storage";
import {
  SEED_FOLLOW_UPS,
  SEED_OPERATIONS,
  SEED_ACTIVITIES,
} from "../mock/mock-patients.data";

export class MockClinicalRepository implements IClinicalRepository {
  private followUpsKey = "clinical_follow_ups";
  private operationsKey = "clinical_operations";
  private activitiesKey = "clinical_activities";

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!MockStorage.get<FollowUp[]>(this.followUpsKey)) {
      MockStorage.set(this.followUpsKey, SEED_FOLLOW_UPS);
    }
    if (!MockStorage.get<Operation[]>(this.operationsKey)) {
      MockStorage.set(this.operationsKey, SEED_OPERATIONS);
    }
    if (!MockStorage.get<ClinicalActivity[]>(this.activitiesKey)) {
      MockStorage.set(this.activitiesKey, SEED_ACTIVITIES);
    }
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const followUps = MockStorage.get<FollowUp[]>(this.followUpsKey) || [];
    const operations = MockStorage.get<Operation[]>(this.operationsKey) || [];

    // Today's date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split("T")[0];

    const todayFollowUps = followUps.filter(
      (f) => f.scheduledDate === todayStr || f.scheduledDate === "2026-09-20"
    );
    const todayOperations = operations.filter(
      (o) => o.scheduledDate === todayStr || o.scheduledDate === "2026-09-20"
    );

    return {
      todayPatientsCount: 12,
      todayFollowUpsCount: todayFollowUps.length > 0 ? todayFollowUps.length : 4,
      pendingInvestigationsCount: 7,
      todayOperationsCount: todayOperations.length > 0 ? todayOperations.length : 2,
    };
  }

  public async getTodayFollowUps(): Promise<FollowUp[]> {
    return MockStorage.get<FollowUp[]>(this.followUpsKey) || [];
  }

  public async getTodayOperations(): Promise<Operation[]> {
    return MockStorage.get<Operation[]>(this.operationsKey) || [];
  }

  public async getRecentActivities(limit: number = 5): Promise<ClinicalActivity[]> {
    const list = MockStorage.get<ClinicalActivity[]>(this.activitiesKey) || [];
    return list.slice(0, limit);
  }
}
