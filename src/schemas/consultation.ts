import { z } from "zod";

export const consanguinitySchema = z.enum(["yes", "no"], {
  message: "Please select either Yes or No for consanguinity.",
});

export const createConsultationSchema = z.object({
  patientId: z
    .string({
      message: "Patient identifier is required.",
    })
    .trim()
    .min(1, "Patient identifier is required."),
  consultationDate: z
    .string({
      message: "Consultation date is required.",
    })
    .trim()
    .refine((val) => {
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Consultation date must be a valid date."),
  chiefComplaint: z.string().trim().max(10000, "Text is too long.").optional(),
  birthHistory: z.string().trim().max(10000, "Text is too long.").optional(),
  familyHistory: z.string().trim().max(10000, "Text is too long.").optional(),
  consanguinity: consanguinitySchema.optional(),
  drugHistory: z.string().trim().max(10000, "Text is too long.").optional(),
  others: z.string().trim().max(10000, "Text is too long.").optional(),
  clinicalExamination: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional(),
  investigationAdvised: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional(),
  currentInvestigation: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional(),
  provisionalDiagnosis: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional(),
  differentialDiagnosis: z
    .string()
    .trim()
    .max(10000, "Text is too long.")
    .optional(),
  plan: z.string().trim().max(10000, "Text is too long.").optional(),
  advice: z.string().trim().max(10000, "Text is too long.").optional(),
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
});

export const updateConsultationSchema = createConsultationSchema
  .omit({ patientId: true })
  .partial();

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
