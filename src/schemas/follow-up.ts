import { z } from "zod";

export const followUpStatusSchema = z.enum(
  ["scheduled", "completed", "cancelled", "rescheduled"],
  {
    message: "Invalid follow-up status.",
  }
);

export const followUpPrioritySchema = z.enum(
  ["normal", "high", "urgent", "routine", "review"],
  {
    message: "Invalid follow-up priority.",
  }
);

export const followUpOutcomeSchema = z.enum(
  ["improved", "unchanged", "worsened"],
  {
    message: "Clinical outcome must be 'improved', 'unchanged', or 'worsened'.",
  }
);

export const createFollowUpSchema = z.object({
  patientId: z
    .string({
      message: "Patient identifier is required.",
    })
    .trim()
    .min(1, "Patient identifier is required."),
  patientCode: z.string().trim().optional(),
  chamberId: z.string().uuid("Invalid chamber ID format.").optional().nullable().or(z.literal("")),
  consultationId: z.string().uuid("Invalid consultation ID.").optional().nullable().or(z.literal("")),
  originatingConsultationId: z.string().uuid("Invalid originating consultation ID.").optional().nullable().or(z.literal("")),
  scheduledDate: z
    .string({
      message: "Follow-up date is required.",
    })
    .trim()
    .refine((val) => {
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Follow-up date must be a valid date."),
  scheduledTime: z.string().trim().max(16).optional().nullable().or(z.literal("")),
  reason: z
    .string()
    .trim()
    .max(1000, "Follow-up reason is too long.")
    .optional()
    .default("Routine follow-up")
    .or(z.literal("")),
  notes: z.string().trim().max(5000, "Notes are too long.").optional().or(z.literal("")),
  priority: followUpPrioritySchema.optional().default("routine"),
});

export const updateFollowUpSchema = z.object({
  scheduledDate: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      return !isNaN(new Date(val).getTime());
    }, "Scheduled date must be a valid date.")
    .optional(),
  scheduledTime: z.string().trim().max(16).optional(),
  reason: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
  consultationId: z.string().uuid().optional().nullable().or(z.literal("")),
  originatingConsultationId: z.string().uuid().optional().nullable().or(z.literal("")),
  status: followUpStatusSchema.optional(),
  clinicalOutcome: followUpOutcomeSchema.optional().nullable(),
  outcomeNotes: z.string().trim().max(2000).optional().nullable(),
  cancellationReason: z.string().trim().max(1000).optional().nullable(),
  priority: followUpPrioritySchema.optional(),
  followUpConsultationId: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const completeFollowUpSchema = z.object({
  clinicalOutcome: followUpOutcomeSchema,
  outcomeNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  followUpConsultationId: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const rescheduleFollowUpSchema = z.object({
  scheduledDate: z
    .string({
      message: "New follow-up date is required.",
    })
    .trim()
    .refine((val) => {
      const parsed = new Date(val);
      return !isNaN(parsed.getTime());
    }, "Date must be a valid date."),
  scheduledTime: z.string().trim().max(16).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const cancelFollowUpSchema = z.object({
  cancellationReason: z
    .string({
      message: "Cancellation reason is required.",
    })
    .trim()
    .min(2, "Cancellation reason must be at least 2 characters.")
    .max(1000, "Cancellation reason is too long."),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;
export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>;
export type CancelFollowUpInput = z.infer<typeof cancelFollowUpSchema>;
