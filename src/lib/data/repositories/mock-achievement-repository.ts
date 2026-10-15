import { IDoctorAchievementRepository } from "./achievement-repository.interface";
import {
  DoctorAchievement,
  CreateAchievementDTO,
  UpdateAchievementDTO,
  AchievementFilterParams,
  ACHIEVEMENT_CATEGORIES,
} from "@/types/achievement";
import { MockStorage } from "../mock/mock-storage";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import { validateAndNormalizePublicationUrl } from "@/lib/validators/publication-url-validator";

export class MockDoctorAchievementRepository
  implements IDoctorAchievementRepository
{
  private storageKey = "doctor_achievements_list";

  private getAllInternal(): DoctorAchievement[] {
    return MockStorage.get<DoctorAchievement[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: DoctorAchievement[]): void {
    MockStorage.set(this.storageKey, items);
  }

  async getAchievements(
    params?: AchievementFilterParams
  ): Promise<DoctorAchievement[]> {
    let items = this.getAllInternal();

    if (params?.category && params.category !== "all") {
      items = items.filter((item) => item.category === params.category);
    }

    if (params?.isPublished !== undefined && params.isPublished !== "all") {
      items = items.filter((item) => item.isPublished === params.isPublished);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.institution && item.institution.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.evidenceTitle && item.evidenceTitle.toLowerCase().includes(q))
      );
    }

    if (params?.startDate) {
      items = items.filter(
        (item) => item.achievementDate && item.achievementDate >= params.startDate!
      );
    }

    if (params?.endDate) {
      items = items.filter(
        (item) => item.achievementDate && item.achievementDate <= params.endDate!
      );
    }

    // Sort order: displayOrder ASC, then achievementDate DESC (nulls last), then createdAt DESC
    return items.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.achievementDate && b.achievementDate) {
        return b.achievementDate.localeCompare(a.achievementDate);
      }
      if (a.achievementDate && !b.achievementDate) return -1;
      if (!a.achievementDate && b.achievementDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getAchievementById(id: string): Promise<DoctorAchievement | null> {
    const items = this.getAllInternal();
    return items.find((item) => item.id === id) || null;
  }

  async createAchievement(
    dto: CreateAchievementDTO
  ): Promise<DoctorAchievement> {
    // 1. Google Drive URL validation (optional)
    let normalizedDriveUrl: string | null = null;
    if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
      const driveRes = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
      if (!driveRes.isValid || !driveRes.normalizedUrl) {
        throw new ValidationError(
          driveRes.error || "Must be a valid HTTPS Google Drive URL"
        );
      }
      normalizedDriveUrl = driveRes.normalizedUrl;
    }

    // 2. Publication URL validation (optional)
    let normalizedPubUrl: string | null = null;
    if (dto.publicationUrl && dto.publicationUrl.trim().length > 0) {
      const pubRes = validateAndNormalizePublicationUrl(dto.publicationUrl);
      if (!pubRes.isValid || !pubRes.normalizedUrl) {
        throw new ValidationError(
          pubRes.error || "Must be a valid secure public HTTPS publication URL"
        );
      }
      normalizedPubUrl = pubRes.normalizedUrl;
    }

    // 3. Expiration date check
    if (
      dto.achievementDate &&
      dto.expirationDate &&
      dto.expirationDate < dto.achievementDate
    ) {
      throw new ValidationError(
        "Expiration date cannot be earlier than achievement date"
      );
    }

    // 4. Duplicate prevention check
    const items = this.getAllInternal();
    const isDuplicate = items.some(
      (item) =>
        item.title.trim().toLowerCase() === dto.title.trim().toLowerCase() &&
        item.category === dto.category &&
        (item.institution || "").trim().toLowerCase() ===
          (dto.institution || "").trim().toLowerCase() &&
        (item.achievementDate || "") === (dto.achievementDate || "")
    );

    if (isDuplicate) {
      throw new ValidationError(
        "An achievement record with identical title, category, institution, and date already exists"
      );
    }

    const now = new Date().toISOString();
    const newAchievement: DoctorAchievement = {
      id: `achv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: dto.title.trim(),
      category: dto.category,
      institution: dto.institution?.trim() || null,
      achievementDate: dto.achievementDate || null,
      expirationDate: dto.expirationDate || null,
      description: dto.description?.trim() || null,
      evidenceTitle: dto.evidenceTitle?.trim() || null,
      driveUrl: normalizedDriveUrl,
      publicationUrl: normalizedPubUrl,
      displayOrder: dto.displayOrder ?? 0,
      isPublished: dto.isPublished ?? true,
      doctorId: dto.doctorId || null,
      createdAt: now,
      updatedAt: now,
    };

    items.push(newAchievement);
    this.saveAllInternal(items);
    return newAchievement;
  }

  async updateAchievement(
    id: string,
    dto: UpdateAchievementDTO
  ): Promise<DoctorAchievement> {
    const items = this.getAllInternal();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new DataError(
        `Doctor achievement with ID "${id}" does not exist`,
        "NOT_FOUND"
      );
    }

    const existing = items[index];

    // URL validations
    let normalizedDriveUrl: string | null = existing.driveUrl ?? null;
    if (dto.driveUrl !== undefined) {
      if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
        const driveRes = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
        if (!driveRes.isValid || !driveRes.normalizedUrl) {
          throw new ValidationError(
            driveRes.error || "Must be a valid HTTPS Google Drive URL"
          );
        }
        normalizedDriveUrl = driveRes.normalizedUrl;
      } else {
        normalizedDriveUrl = null;
      }
    }

    let normalizedPubUrl: string | null = existing.publicationUrl ?? null;
    if (dto.publicationUrl !== undefined) {
      if (dto.publicationUrl && dto.publicationUrl.trim().length > 0) {
        const pubRes = validateAndNormalizePublicationUrl(dto.publicationUrl);
        if (!pubRes.isValid || !pubRes.normalizedUrl) {
          throw new ValidationError(
            pubRes.error || "Must be a valid secure public HTTPS publication URL"
          );
        }
        normalizedPubUrl = pubRes.normalizedUrl;
      } else {
        normalizedPubUrl = null;
      }
    }

    const targetAchDate =
      dto.achievementDate !== undefined
        ? dto.achievementDate
        : existing.achievementDate;
    const targetExpDate =
      dto.expirationDate !== undefined
        ? dto.expirationDate
        : existing.expirationDate;

    if (targetAchDate && targetExpDate && targetExpDate < targetAchDate) {
      throw new ValidationError(
        "Expiration date cannot be earlier than achievement date"
      );
    }

    const updated: DoctorAchievement = {
      ...existing,
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      category: dto.category ?? existing.category,
      institution:
        dto.institution !== undefined
          ? dto.institution?.trim() || null
          : existing.institution,
      achievementDate: targetAchDate || null,
      expirationDate: targetExpDate || null,
      description:
        dto.description !== undefined
          ? dto.description?.trim() || null
          : existing.description,
      evidenceTitle:
        dto.evidenceTitle !== undefined
          ? dto.evidenceTitle?.trim() || null
          : existing.evidenceTitle,
      driveUrl: normalizedDriveUrl,
      publicationUrl: normalizedPubUrl,
      displayOrder: dto.displayOrder ?? existing.displayOrder,
      isPublished: dto.isPublished ?? existing.isPublished,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    this.saveAllInternal(items);
    return updated;
  }

  async deleteAchievement(id: string): Promise<boolean> {
    const items = this.getAllInternal();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new DataError(
        `Doctor achievement with ID "${id}" does not exist`,
        "NOT_FOUND"
      );
    }

    items.splice(index, 1);
    this.saveAllInternal(items);
    return true;
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    const items = this.getAllInternal();
    const counts: Record<string, number> = {};

    for (const cat of ACHIEVEMENT_CATEGORIES) {
      counts[cat] = 0;
    }

    for (const item of items) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }

    return counts;
  }
}
