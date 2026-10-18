import { formatDisplayDate, formatAppointmentTime } from "@/lib/date-utils";
import { OFFICIAL_DOCTOR_PROFILE } from "@/config/doctor-profile";

export interface ReminderTemplateParams {
  doctorName?: string;
  chamberName?: string;
  followUpDate: string; // YYYY-MM-DD
  followUpTime?: string | null; // e.g. "10:00 AM" or undefined
  clinicPhone?: string;
  language?: "en" | "bn";
}

const DEFAULT_DOCTOR_NAME_EN = OFFICIAL_DOCTOR_PROFILE.fullName;
const DEFAULT_DOCTOR_NAME_BN = OFFICIAL_DOCTOR_PROFILE.bengaliName;
const DEFAULT_CLINIC_PHONE = "+8801700000000";

/**
 * Formats date into Bangla text representation
 */
function formatBanglaDate(ymdStr: string): string {
  const [year, month, day] = ymdStr.split("-");
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const toBn = (s: string) => s.split("").map((c) => bnDigits[parseInt(c, 10)] || c).join("");

  const monthsBn = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্টেম্বর",
    "অক্টোবর",
    "নভেম্বর",
    "ডিসেম্বর",
  ];
  const mIndex = parseInt(month, 10) - 1;
  const mName = monthsBn[mIndex] || month;

  return `${toBn(day)} ${mName}, ${toBn(year)}`;
}

/**
 * Converts English time string (e.g., "10:30 AM") to Bangla numerals and text
 */
function formatBanglaTime(timeStr: string): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return timeStr
    .replace(/\d/g, (d) => bnDigits[parseInt(d, 10)])
    .replace(/AM/i, "সকাল")
    .replace(/PM/i, "বিকাল");
}

/**
 * Renders a strict, privacy-preserving reminder SMS text.
 * Strictly omits diagnoses, medications, internal IDs, or sensitive medical history.
 */
export function renderFollowUpReminderMessage(params: ReminderTemplateParams): string {
  const language = params.language || "en";
  const validTime = formatAppointmentTime(params.followUpTime);
  const clinicPhone = params.clinicPhone || DEFAULT_CLINIC_PHONE;

  if (language === "bn") {
    const docName = params.doctorName || DEFAULT_DOCTOR_NAME_BN;
    const dateStr = formatBanglaDate(params.followUpDate);
    const chamber = params.chamberName ? ` (${params.chamberName})` : "";
    const timePart = validTime ? ` সময়: ${formatBanglaTime(validTime)}` : "";

    return `${docName}: আপনার পরবর্তী ফলো-আপ অ্যাপয়েন্টমেন্ট ${dateStr}${timePart}${chamber}। তথ্যের জন্য: ${clinicPhone}। বন্ধ করতে STOP লিখুন।`;
  }

  // English Default
  const docName = params.doctorName || DEFAULT_DOCTOR_NAME_EN;
  const dateStr = formatDisplayDate(params.followUpDate, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const chamber = params.chamberName ? ` (${params.chamberName})` : "";
  const timePart = validTime ? ` at ${validTime}` : "";

  return `${docName}: Reminder for your scheduled follow-up on ${dateStr}${timePart}${chamber}. For questions or rescheduling call ${clinicPhone}. Reply STOP to opt out.`;
}
