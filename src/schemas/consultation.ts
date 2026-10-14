import { z } from "zod";

export const consanguinitySchema = z.enum(["yes", "no"], {
  message: "Please select either Yes or No for consanguinity.",
});

export const consultationStatusSchema = z.enum(
  ["scheduled", "in-progress", "completed", "cancelled"],
  {
    message: "Invalid consultation status.",
  }
);

export const clinicalOutcomeSchema = z.enum(
  ["improved", "unchanged", "worsened"],
  {
    message: "Clinical outcome must be 'improved', 'unchanged', or 'worsened'.",
  }
);

export const createConsultationSchema = z.object({
  patientId: z
    .string({
      message: "Patient identifier is required.",
    })
    .trim()
    .min(1, "Patient identifier is required."),
  chamberId: z
    .string()
    .uuid("Invalid chamber ID format.")
    .optional()
    .nullable()
    .or(z.literal("")),
  consultationDate: z
    .string({
      message: "Consultation date is required.",
    })
    .trim()
    .refine((val) => {
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Consultation date must be a valid date."),
  consultationTime: z.string().trim().max(16).optional().or(z.literal("")),
  status: consultationStatusSchema.optional().default("completed"),

  // Clinical History
  chiefComplaint: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  birthHistory: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  familyHistory: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  consanguinity: consanguinitySchema.optional(),
  drugHistory: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  others: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),

  // Examination & Clinical Notes
  clinicalExamination: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional()
    .or(z.literal("")),
  clinicalNotes: z
    .string()
    .trim()
    .max(10000, "Clinical notes are too long.")
    .optional()
    .or(z.literal("")),

  // Investigations
  investigationAdvised: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional()
    .or(z.literal("")),
  currentInvestigation: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional()
    .or(z.literal("")),

  // Diagnoses
  provisionalDiagnosis: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional()
    .or(z.literal("")),
  differentialDiagnosis: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional()
    .or(z.literal("")),

  // Treatment Plan & Management
  plan: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  advice: z.string().trim().max(10000, "Text is too long.").optional().or(z.literal("")),
  treatmentInstructions: z
    .string()
    .trim()
    .max(10000, "Treatment instructions are too long.")
    .optional()
    .or(z.literal("")),
  lifestyleInstructions: z
    .string()
    .trim()
    .max(10000, "Lifestyle instructions are too long.")
    .optional()
    .or(z.literal("")),
  treatmentStartDate: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      return !isNaN(new Date(val).getTime());
    }, "Treatment start date must be a valid date.")
    .optional()
    .or(z.literal("")),
  treatmentReviewDate: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      return !isNaN(new Date(val).getTime());
    }, "Treatment review date must be a valid date.")
    .optional()
    .or(z.literal("")),
  nextFollowUp: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Next follow-up date must be a valid date.")
    .optional()
    .or(z.literal("")),
  followUpReason: z
    .string()
    .trim()
    .max(1000, "Follow-up reason is too long.")
    .optional()
    .or(z.literal("")),

  // Longitudinal Tracking & Outcomes
  clinicalOutcome: clinicalOutcomeSchema.optional().or(z.literal("")),
  progressNotes: z
    .string()
    .trim()
    .max(10000, "Progress notes are too long.")
    .optional()
    .or(z.literal("")),
  isFollowUp: z.boolean().optional().default(false),
  originatingConsultationId: z
    .string()
    .uuid("Invalid originating consultation ID.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateConsultationSchema = createConsultationSchema
  .omit({ patientId: true })
  .partial();

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
