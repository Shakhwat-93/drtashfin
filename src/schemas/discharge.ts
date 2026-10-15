import { z } from "zod";
import {
  DISCHARGE_CONDITIONS,
  DISCHARGE_STATUSES,
} from "@/types/discharge";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

/**
 * Validation schema for creating a new patient discharge report.
 */
export const createDischargeSchema = z.object({
  patientId: z.string().trim().min(1, "Patient ID is required"),
  consultationId: z.string().trim().optional().nullable().or(z.literal("")),
  dischargeDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Discharge date must be in YYYY-MM-DD format"),
  dischargeTime: z
    .string()
    .trim()
    .max(16, "Discharge time must be 16 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(DISCHARGE_STATUSES).optional().default("draft"),
  clinicalReason: z
    .string()
    .trim()
    .min(1, "Clinical reason for discharge is required")
    .max(2000, "Clinical reason must be 2000 characters or less"),
  finalDiagnosis: z
    .string()
    .trim()
    .min(1, "Final diagnosis or clinical assessment is required")
    .max(2000, "Final diagnosis must be 2000 characters or less"),
  treatmentSummary: z
    .string()
    .trim()
    .min(1, "Summary of treatment provided is required")
    .max(5000, "Treatment summary must be 5000 characters or less"),
  conditionAtDischarge: z.enum(DISCHARGE_CONDITIONS, {
    message: "Invalid condition at discharge",
  }),
  dischargeInstructions: z
    .string()
    .trim()
    .min(1, "Discharge instructions and care guidance are required")
    .max(5000, "Discharge instructions must be 5000 characters or less"),
  medicationInstructions: z
    .string()
    .trim()
    .max(5000, "Medication instructions must be 5000 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  recommendedFollowUpDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Follow-up date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .or(z.literal("")),
  followUpInstructions: z
    .string()
    .trim()
    .max(2000, "Follow-up instructions must be 2000 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  complications: z
    .string()
    .trim()
    .max(2000, "Complications must be 2000 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  doctorId: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  doctorName: z
    .string()
    .trim()
    .max(255)
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
        const result = validateAndNormalizeGoogleDriveUrl(val);
        return result.isValid;
      },
      {
        message: "Invalid Google Drive link. Must be a valid HTTPS Google Drive file, folder, or document link",
      }
    ),
  scheduleFollowUp: z.boolean().optional(),
  followUpChamberId: z.string().trim().optional().nullable().or(z.literal("")),
  followUpPriority: z
    .enum(["normal", "high", "urgent", "routine", "review"])
    .optional(),
});

export type CreateDischargeInput = z.infer<typeof createDischargeSchema>;

/**
 * Validation schema for updating a draft discharge report.
 */
export const updateDischargeSchema = createDischargeSchema
  .omit({ patientId: true })
  .partial();

export type UpdateDischargeInput = z.infer<typeof updateDischargeSchema>;

/**
 * Validation schema for amending a finalized discharge report.
 */
export const amendDischargeSchema = z.object({
  amendmentNotes: z
    .string()
    .trim()
    .min(1, "Amendment notes explaining the addition or correction are required")
    .max(5000, "Amendment notes must be 5000 characters or less"),
  amendedBy: z.string().trim().max(255).optional().nullable(),
});

export type AmendDischargeInput = z.infer<typeof amendDischargeSchema>;

/**
 * Validation schema for finalizing a discharge report.
 */
export const finalizeDischargeSchema = z.object({
  confirmed: z.literal(true, {
    message: "Explicit confirmation is required to finalize discharge record",
  }),
  finalizedBy: z.string().trim().max(255).optional().nullable(),
});

export type FinalizeDischargeInput = z.infer<typeof finalizeDischargeSchema>;
