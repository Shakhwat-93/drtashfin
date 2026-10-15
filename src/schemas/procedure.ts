import { z } from "zod";
import { PROCEDURE_CATEGORIES } from "@/types/procedure";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

/**
 * Validation schema for recording a new operation or medical procedure.
 */
export const createProcedureSchema = z.object({
  patientId: z.string().trim().min(1, "Patient ID is required"),
  consultationId: z.string().trim().optional().nullable().or(z.literal("")),
  procedureName: z
    .string()
    .trim()
    .min(1, "Procedure or operation name is required")
    .max(255, "Procedure name must be 255 characters or less"),
  category: z.enum(PROCEDURE_CATEGORIES, {
    message: "Invalid procedure category. Must be Surgery, Minor Procedure, Diagnostic Procedure, Therapeutic Procedure, or Other",
  }),
  procedureDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Procedure date must be in YYYY-MM-DD format"),
  hospitalFacility: z
    .string()
    .trim()
    .max(255, "Hospital facility name must be 255 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  performingDoctor: z
    .string()
    .trim()
    .max(255, "Performing doctor name must be 255 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  clinicalIndication: z
    .string()
    .trim()
    .max(2000, "Clinical indication must be 2000 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  doctorNotes: z
    .string()
    .trim()
    .max(5000, "Doctor notes must be 5000 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  outcome: z
    .string()
    .trim()
    .max(1000, "Outcome notes must be 1000 characters or less")
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
  recoveryNotes: z
    .string()
    .trim()
    .max(3000, "Recovery notes must be 3000 characters or less")
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
});

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>;

/**
 * Validation schema for updating an existing procedure record.
 */
export const updateProcedureSchema = createProcedureSchema
  .omit({ patientId: true })
  .partial();

export type UpdateProcedureInput = z.infer<typeof updateProcedureSchema>;
