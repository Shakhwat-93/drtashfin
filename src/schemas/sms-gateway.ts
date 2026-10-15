import { z } from "zod";
import { normalizeBdPhoneNumber } from "@/lib/sms/phone-utils";

/**
 * Validation schema for saving SMS gateway settings.
 */
export const saveSmsGatewaySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(4, "API Key must be at least 4 characters")
    .max(255, "API Key is too long")
    .optional()
    .or(z.literal("")),
  callerId: z
    .string()
    .trim()
    .min(1, "Caller ID / Sender ID cannot be empty")
    .max(30, "Caller ID must be 30 characters or less")
    .default("1234"),
  isEnabled: z.boolean().default(false),
});

export type SaveSmsGatewayInput = z.infer<typeof saveSmsGatewaySchema>;

/**
 * Validation schema for sending a test SMS from Settings.
 */
export const sendTestSmsSchema = z.object({
  recipientPhone: z
    .string()
    .trim()
    .min(1, "Recipient phone number is required")
    .refine((val) => {
      const res = normalizeBdPhoneNumber(val);
      return res.isValid;
    }, {
      message: "Please enter a valid Bangladesh mobile number (e.g., 017XXXXXXXX or +88017XXXXXXXX)",
    }),
  confirmation: z
    .boolean()
    .refine((val) => val === true, {
      message: "You must confirm sending a test SMS and acknowledge carrier charges",
    }),
});

export type SendTestSmsInput = z.infer<typeof sendTestSmsSchema>;
