import {
  DoctorAchievement,
  CreateAchievementDTO,
  UpdateAchievementDTO,
  AchievementFilterParams,
} from "@/types/achievement";

export interface IDoctorAchievementRepository {
  /**
   * Retrieves achievements matching filter parameters.
   * Sorted primarily by displayOrder ASC, then achievementDate DESC.
   */
  getAchievements(
    params?: AchievementFilterParams
  ): Promise<DoctorAchievement[]>;

  /**
   * Retrieves a single achievement by UUID.
   */
  getAchievementById(id: string): Promise<DoctorAchievement | null>;

  /**
   * Creates a new achievement record.
   * Validates URLs and prevents duplicate records.
   */
  createAchievement(dto: CreateAchievementDTO): Promise<DoctorAchievement>;

  /**
   * Updates an existing achievement record.
   */
  updateAchievement(
    id: string,
    dto: UpdateAchievementDTO
  ): Promise<DoctorAchievement>;

  /**
   * Deletes an achievement record.
   */
  deleteAchievement(id: string): Promise<boolean>;

  /**
   * Retrieves total counts of achievements grouped by category.
   */
  getCategoryCounts(): Promise<Record<string, number>>;
}
