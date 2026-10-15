import { z } from "zod";
import { ACHIEVEMENT_CATEGORIES } from "@/types/achievement";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import { validateAndNormalizePublicationUrl } from "@/lib/validators/publication-url-validator";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validation schema for creating a new doctor achievement record.
 */
export const createAchievementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Achievement title must be at least 2 characters")
      .max(255, "Achievement title must be 255 characters or less"),
    category: z.enum(ACHIEVEMENT_CATEGORIES, {
      message: "Please select a valid achievement category",
    }),
    institution: z
      .string()
      .trim()
      .max(255, "Institution name must be 255 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    achievementDate: z
      .string()
      .trim()
      .regex(dateRegex, "Achievement date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    expirationDate: z
      .string()
      .trim()
      .regex(dateRegex, "Expiration date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(5000, "Description must be 5000 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    evidenceTitle: z
      .string()
      .trim()
      .max(255, "Evidence title must be 255 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    driveUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return validateAndNormalizeGoogleDriveUrl(val).isValid;
        },
        {
          message:
            "Must be a valid HTTPS Google Drive or Google Docs URL (drive.google.com or docs.google.com)",
        }
      ),
    publicationUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return validateAndNormalizePublicationUrl(val).isValid;
        },
        {
          message:
            "Must be a valid secure public HTTPS URL (e.g. https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/...)",
        }
      ),
    displayOrder: z
      .number()
      .int()
      .min(0, "Display order must be 0 or greater")
      .max(99999)
      .optional()
      .default(0),
    isPublished: z.boolean().optional().default(true),
    doctorId: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.achievementDate &&
        data.expirationDate &&
        data.achievementDate.length > 0 &&
        data.expirationDate.length > 0
      ) {
        return data.expirationDate >= data.achievementDate;
      }
      return true;
    },
    {
      message: "Expiration date must be on or after achievement date",
      path: ["expirationDate"],
    }
  );

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;

/**
 * Validation schema for updating an existing doctor achievement record.
 */
export const updateAchievementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Achievement title must be at least 2 characters")
      .max(255, "Achievement title must be 255 characters or less")
      .optional(),
    category: z.enum(ACHIEVEMENT_CATEGORIES, {
      message: "Please select a valid achievement category",
    }).optional(),
    institution: z
      .string()
      .trim()
      .max(255, "Institution name must be 255 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    achievementDate: z
      .string()
      .trim()
      .regex(dateRegex, "Achievement date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    expirationDate: z
      .string()
      .trim()
      .regex(dateRegex, "Expiration date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(5000, "Description must be 5000 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    evidenceTitle: z
      .string()
      .trim()
      .max(255, "Evidence title must be 255 characters or less")
      .optional()
      .nullable()
      .or(z.literal("")),
    driveUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return validateAndNormalizeGoogleDriveUrl(val).isValid;
        },
        {
          message:
            "Must be a valid HTTPS Google Drive or Google Docs URL (drive.google.com or docs.google.com)",
        }
      ),
    publicationUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true;
          return validateAndNormalizePublicationUrl(val).isValid;
        },
        {
          message:
            "Must be a valid secure public HTTPS URL (e.g. https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/...)",
        }
      ),
    displayOrder: z
      .number()
      .int()
      .min(0, "Display order must be 0 or greater")
      .max(99999)
      .optional(),
    isPublished: z.boolean().optional(),
    doctorId: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.achievementDate &&
        data.expirationDate &&
        data.achievementDate.length > 0 &&
        data.expirationDate.length > 0
      ) {
        return data.expirationDate >= data.achievementDate;
      }
      return true;
    },
    {
      message: "Expiration date must be on or after achievement date",
      path: ["expirationDate"],
    }
  );

export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
