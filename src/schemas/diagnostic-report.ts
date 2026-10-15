/**
 * Diagnostic Report Zod Validation Schemas
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

import { z } from "zod";
import { DIAGNOSTIC_REPORT_CATEGORIES } from "@/types/diagnostic-report";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

const googleDriveUrlSchema = z
  .string()
  .min(1, "Google Drive link is required")
  .refine(
    (url) => {
      const res = validateAndNormalizeGoogleDriveUrl(url);
      return res.isValid;
    },
    {
      message:
        "Must be a valid HTTPS Google Drive file, folder, or document URL (e.g., https://drive.google.com/file/d/...)",
    }
  );

export const createDiagnosticReportSchema = z.object({
  patientId: z.string().uuid("Invalid patient UUID format"),
  consultationId: z.string().uuid("Invalid consultation UUID format").nullable().optional(),
  testName: z
    .string()
    .min(2, "Test name must be at least 2 characters")
    .max(200, "Test name cannot exceed 200 characters")
    .transform((val) => val.trim()),
  category: z.enum(DIAGNOSTIC_REPORT_CATEGORIES, {
    message: "Invalid diagnostic report category",
  }),
  testDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Test date must be in YYYY-MM-DD format"),
  diagnosticCenter: z
    .string()
    .max(200, "Diagnostic center name cannot exceed 200 characters")
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : null)),
  doctorNotes: z
    .string()
    .max(2000, "Doctor note cannot exceed 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : null)),
  driveUrl: googleDriveUrlSchema,
});

export const updateDiagnosticReportSchema = z.object({
  consultationId: z.string().uuid("Invalid consultation UUID format").nullable().optional(),
  testName: z
    .string()
    .min(2, "Test name must be at least 2 characters")
    .max(200, "Test name cannot exceed 200 characters")
    .transform((val) => val.trim())
    .optional(),
  category: z.enum(DIAGNOSTIC_REPORT_CATEGORIES).optional(),
  testDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Test date must be in YYYY-MM-DD format")
    .optional(),
  diagnosticCenter: z
    .string()
    .max(200, "Diagnostic center name cannot exceed 200 characters")
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : null)),
  doctorNotes: z
    .string()
    .max(2000, "Doctor note cannot exceed 2000 characters")
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : null)),
  driveUrl: googleDriveUrlSchema.optional(),
});

export type CreateDiagnosticReportInput = z.infer<typeof createDiagnosticReportSchema>;
export type UpdateDiagnosticReportInput = z.infer<typeof updateDiagnosticReportSchema>;
