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
  address: z.string().trim().max(250, "Address is too long.").optional(),
  bloodGroup: bloodGroupSchema.optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z.object({
  search: z.string().trim().optional(),
  gender: genderSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
