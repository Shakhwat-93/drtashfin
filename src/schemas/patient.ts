import { z } from "zod";

export const genderSchema = z.enum(["male", "female", "other"], {
  message: "Please select a valid gender option.",
});

export const bloodGroupSchema = z.enum(
  ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  {
    message: "Please select a valid blood group.",
  }
);

export const createPatientSchema = z.object({
  name: z
    .string({
      message: "Patient name is required.",
    })
    .trim()
    .min(2, "Name must be at least 2 characters long.")
    .max(100, "Name must not exceed 100 characters."),
  dateOfBirth: z
    .string({
      message: "Date of birth is required.",
    })
    .refine((dateStr) => {
      const parsed = new Date(dateStr);
      return !isNaN(parsed.getTime()) && parsed <= new Date();
    }, "Date of birth must be a valid past date."),
  gender: genderSchema,
  age: z
    .number()
    .int("Age must be an integer.")
    .min(0, "Age cannot be negative.")
    .max(130, "Age must be realistic (under 130).")
    .optional(),
  weight: z
    .number()
    .positive("Weight must be greater than 0.")
    .max(500, "Weight must be under 500 kg.")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+?[0-9\s\-()]{7,25})?$/,
      "Please enter a valid contact phone number."
    )
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(250, "Address is too long.").optional().or(z.literal("")),
  bloodGroup: bloodGroupSchema.optional().or(z.literal("")),
  chamberId: z.string().optional().or(z.literal("")),

  // Section A: Family & Guardian Identity
  fatherName: z.string().trim().max(100, "Father's name is too long.").optional().or(z.literal("")),
  motherName: z.string().trim().max(100, "Mother's name is too long.").optional().or(z.literal("")),
  guardianName: z.string().trim().max(100, "Guardian's name is too long.").optional().or(z.literal("")),
  guardianRelationship: z.string().trim().max(50, "Guardian relationship is too long.").optional().or(z.literal("")),

  // Section B: Contact & Emergency Information
  secondaryPhone: z
    .string()
    .trim()
    .regex(
      /^(\+?[0-9\s\-()]{7,25})?$/,
      "Please enter a valid alternative phone number."
    )
    .optional()
    .or(z.literal("")),
  permanentAddress: z.string().trim().max(250, "Permanent address is too long.").optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(100, "Emergency contact name is too long.").optional().or(z.literal("")),
  emergencyContactRelationship: z.string().trim().max(50, "Emergency contact relationship is too long.").optional().or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(
      /^(\+?[0-9\s\-()]{7,25})?$/,
      "Please enter a valid emergency contact phone number."
    )
    .optional()
    .or(z.literal("")),

  // Section C: Additional Clinical & Social Information
  occupation: z.string().trim().max(100, "Occupation is too long.").optional().or(z.literal("")),
  allergies: z.string().trim().max(500, "Allergies text is too long.").optional().or(z.literal("")),
  medicalHistory: z.string().trim().max(1000, "Medical history is too long.").optional().or(z.literal("")),
  currentMedications: z.string().trim().max(1000, "Current medications list is too long.").optional().or(z.literal("")),
  patientNotes: z.string().trim().max(2000, "Patient notes are too long.").optional().or(z.literal("")),

  // SMS Reminder Consent
  smsConsentStatus: z.enum(["unknown", "opted_in", "opted_out"]).optional().default("unknown"),
  smsConsentAt: z.string().optional().nullable().or(z.literal("")),
  smsConsentSource: z.enum(["registration", "in_person", "profile_update", "opt_out_request", "system_default"]).optional().nullable().or(z.literal("")),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z.object({
  search: z.string().trim().optional(),
  gender: genderSchema.optional(),
  chamberId: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
