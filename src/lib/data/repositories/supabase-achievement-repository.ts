import { SupabaseClient } from "@supabase/supabase-js";
import { IDoctorAchievementRepository } from "./achievement-repository.interface";
import {
  DoctorAchievement,
  CreateAchievementDTO,
  UpdateAchievementDTO,
  AchievementFilterParams,
  ACHIEVEMENT_CATEGORIES,
} from "@/types/achievement";
import { supabase } from "@/lib/supabase/client";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import { validateAndNormalizePublicationUrl } from "@/lib/validators/publication-url-validator";

function mapAchievementFromRow(row: Record<string, unknown>): DoctorAchievement {
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as DoctorAchievement["category"],
    institution: row.institution ? String(row.institution) : null,
    achievementDate: row.achievement_date ? String(row.achievement_date) : null,
    expirationDate: row.expiration_date ? String(row.expiration_date) : null,
    description: row.description ? String(row.description) : null,
    evidenceTitle: row.evidence_title ? String(row.evidence_title) : null,
    driveUrl: row.drive_url ? String(row.drive_url) : null,
    publicationUrl: row.publication_url ? String(row.publication_url) : null,
    displayOrder: typeof row.display_order === "number" ? row.display_order : 0,
    isPublished: Boolean(row.is_published),
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseDoctorAchievementRepository
  implements IDoctorAchievementRepository
{
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async getAchievements(
    params?: AchievementFilterParams
  ): Promise<DoctorAchievement[]> {
    let query = this.client.from("doctor_achievements").select("*");

    if (params?.category && params.category !== "all") {
      query = query.eq("category", params.category);
    }

    if (params?.isPublished !== undefined && params.isPublished !== "all") {
      query = query.eq("is_published", params.isPublished);
    }

    if (params?.startDate) {
      query = query.gte("achievement_date", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("achievement_date", params.endDate);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `title.ilike.${term},institution.ilike.${term},description.ilike.${term},evidence_title.ilike.${term}`
      );
    }

    query = query
      .order("display_order", { ascending: true })
      .order("achievement_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new DataError(`Failed to fetch achievements: ${error.message}`);
    }

    return (data || []).map((row) =>
      mapAchievementFromRow(row as Record<string, unknown>)
    );
  }

  async getAchievementById(id: string): Promise<DoctorAchievement | null> {
    const { data, error } = await this.client
      .from("doctor_achievements")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch achievement: ${error.message}`);
    }

    if (!data) return null;
    return mapAchievementFromRow(data as Record<string, unknown>);
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
    let dupQuery = this.client
      .from("doctor_achievements")
      .select("id")
      .eq("title", dto.title.trim())
      .eq("category", dto.category);

    if (dto.institution && dto.institution.trim().length > 0) {
      dupQuery = dupQuery.eq("institution", dto.institution.trim());
    } else {
      dupQuery = dupQuery.is("institution", null);
    }

    if (dto.achievementDate) {
      dupQuery = dupQuery.eq("achievement_date", dto.achievementDate);
    } else {
      dupQuery = dupQuery.is("achievement_date", null);
    }

    const { data: existingDups } = await dupQuery;
    if (existingDups && existingDups.length > 0) {
      throw new ValidationError(
        "An achievement record with identical title, category, institution, and date already exists"
      );
    }

    const insertPayload = {
      title: dto.title.trim(),
      category: dto.category,
      institution: dto.institution?.trim() || null,
      achievement_date: dto.achievementDate || null,
      expiration_date: dto.expirationDate || null,
      description: dto.description?.trim() || null,
      evidence_title: dto.evidenceTitle?.trim() || null,
      drive_url: normalizedDriveUrl,
      publication_url: normalizedPubUrl,
      display_order: dto.displayOrder ?? 0,
      is_published: dto.isPublished ?? true,
      doctor_id: dto.doctorId || null,
    };

    const { data, error } = await this.client
      .from("doctor_achievements")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      throw new DataError(`Failed to create achievement: ${error.message}`);
    }

    return mapAchievementFromRow(data as Record<string, unknown>);
  }

  async updateAchievement(
    id: string,
    dto: UpdateAchievementDTO
  ): Promise<DoctorAchievement> {
    const existing = await this.getAchievementById(id);
    if (!existing) {
      throw new DataError(
        `Doctor achievement with ID "${id}" does not exist`,
        "NOT_FOUND"
      );
    }

    // URL validations
    let normalizedDriveUrl: string | null | undefined = undefined;
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

    let normalizedPubUrl: string | null | undefined = undefined;
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

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updatePayload.title = dto.title.trim();
    if (dto.category !== undefined) updatePayload.category = dto.category;
    if (dto.institution !== undefined)
      updatePayload.institution = dto.institution?.trim() || null;
    if (dto.achievementDate !== undefined)
      updatePayload.achievement_date = dto.achievementDate || null;
    if (dto.expirationDate !== undefined)
      updatePayload.expiration_date = dto.expirationDate || null;
    if (dto.description !== undefined)
      updatePayload.description = dto.description?.trim() || null;
    if (dto.evidenceTitle !== undefined)
      updatePayload.evidence_title = dto.evidenceTitle?.trim() || null;
    if (normalizedDriveUrl !== undefined)
      updatePayload.drive_url = normalizedDriveUrl;
    if (normalizedPubUrl !== undefined)
      updatePayload.publication_url = normalizedPubUrl;
    if (dto.displayOrder !== undefined)
      updatePayload.display_order = dto.displayOrder;
    if (dto.isPublished !== undefined)
      updatePayload.is_published = dto.isPublished;

    const { data, error } = await this.client
      .from("doctor_achievements")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new DataError(`Failed to update achievement: ${error.message}`);
    }

    return mapAchievementFromRow(data as Record<string, unknown>);
  }

  async deleteAchievement(id: string): Promise<boolean> {
    const existing = await this.getAchievementById(id);
    if (!existing) {
      throw new DataError(
        `Doctor achievement with ID "${id}" does not exist`,
        "NOT_FOUND"
      );
    }

    const { error } = await this.client
      .from("doctor_achievements")
      .delete()
      .eq("id", id);

    if (error) {
      throw new DataError(`Failed to delete achievement: ${error.message}`);
    }

    return true;
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from("doctor_achievements")
      .select("category");

    if (error) {
      throw new DataError(`Failed to fetch category counts: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      counts[cat] = 0;
    }

    for (const row of data || []) {
      const cat = String(row.category);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    }

    return counts;
  }
}
