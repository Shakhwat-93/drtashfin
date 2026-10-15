/**
 * Domain entity and DTO definitions for Doctor Lifetime Achievements & Evidence Management.
 * Phase 29: Doctor Lifetime Achievements & Evidence Management
 *
 * Professional doctor-profile module distinct from patient clinical workflows.
 */

export const ACHIEVEMENT_CATEGORIES = [
  "Academic Qualifications",
  "Professional Certifications",
  "Awards & Honors",
  "Medical Training & Workshops",
  "Conferences & Seminars",
  "Research & Publications",
  "Professional Memberships",
  "Career Milestones",
  "Other Achievements",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface DoctorAchievement {
  id: string; // Unique UUID
  title: string;
  category: AchievementCategory;
  institution?: string | null;
  achievementDate?: string | null; // YYYY-MM-DD
  expirationDate?: string | null; // YYYY-MM-DD
  description?: string | null;
  evidenceTitle?: string | null;
  driveUrl?: string | null;
  publicationUrl?: string | null;
  displayOrder: number;
  isPublished: boolean;
  doctorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAchievementDTO {
  title: string;
  category: AchievementCategory;
  institution?: string | null;
  achievementDate?: string | null;
  expirationDate?: string | null;
  description?: string | null;
  evidenceTitle?: string | null;
  driveUrl?: string | null;
  publicationUrl?: string | null;
  displayOrder?: number;
  isPublished?: boolean;
  doctorId?: string | null;
}

export interface UpdateAchievementDTO {
  title?: string;
  category?: AchievementCategory;
  institution?: string | null;
  achievementDate?: string | null;
  expirationDate?: string | null;
  description?: string | null;
  evidenceTitle?: string | null;
  driveUrl?: string | null;
  publicationUrl?: string | null;
  displayOrder?: number;
  isPublished?: boolean;
  doctorId?: string | null;
}

export interface AchievementFilterParams {
  category?: AchievementCategory | "all";
  searchQuery?: string;
  isPublished?: boolean | "all";
  startDate?: string;
  endDate?: string;
}

export interface AchievementCategorySummary {
  category: AchievementCategory;
  count: number;
}
