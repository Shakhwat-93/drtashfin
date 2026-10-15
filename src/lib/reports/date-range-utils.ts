/**
 * Date Range & Timezone Utilities for Clinical Reports & Dashboard.
 * Phase 30: Clinical Dashboard & Medical Reports
 *
 * Implements strict Asia/Dhaka (+06:00) boundary semantics.
 */

import { DateRange, DateRangePreset } from "@/types/reports";
import {
  CLINIC_TIMEZONE,
  getClinicToday,
  parseYMD,
  formatDateToYMD,
  addDays,
} from "@/lib/date-utils";

export { CLINIC_TIMEZONE };

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a YYYY-MM-DD date string.
 */
export function isValidDateString(dateStr?: string | null): boolean {
  if (!dateStr || !DATE_REGEX.test(dateStr)) return false;
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Converts a clinic date range (YYYY-MM-DD) into exact UTC ISO boundaries
 * for querying TIMESTAMPTZ columns in PostgreSQL.
 */
/**
 * Converts a clinic date range (YYYY-MM-DD) into exact UTC ISO boundaries
 * for querying TIMESTAMPTZ columns in PostgreSQL.
 */
export function toUtcTimestampRange(
  startDateYmd?: string,
  endDateYmd?: string
): { startIso: string; endIso: string } {
  const todayYmd = getClinicToday(CLINIC_TIMEZONE);
  const start = isValidDateString(startDateYmd) ? startDateYmd! : todayYmd;
  const end = isValidDateString(endDateYmd) ? endDateYmd! : todayYmd;

  // Asia/Dhaka is UTC+6
  const startLocal = `${start}T00:00:00.000+06:00`;
  const endLocal = `${end}T23:59:59.999+06:00`;

  return {
    startIso: new Date(startLocal).toISOString(),
    endIso: new Date(endLocal).toISOString(),
  };
}

export type ResolveDateRangeOptions =
  | DateRangePreset
  | {
      preset?: DateRangePreset;
      startDate?: string;
      endDate?: string;
      customStart?: string;
      customEnd?: string;
    };

/**
 * Resolves a DateRangePreset into concrete startDate, endDate, and human-readable label
 * using the clinic's local timezone.
 */
export function resolveDateRange(
  presetOrOptions: ResolveDateRangeOptions,
  customStart?: string,
  customEnd?: string
): DateRange {
  let preset: DateRangePreset = "last30days";
  let effectiveStart = customStart;
  let effectiveEnd = customEnd;

  if (typeof presetOrOptions === "object" && presetOrOptions !== null) {
    preset = presetOrOptions.preset || "last30days";
    effectiveStart = presetOrOptions.startDate || presetOrOptions.customStart || customStart;
    effectiveEnd = presetOrOptions.endDate || presetOrOptions.customEnd || customEnd;
  } else if (typeof presetOrOptions === "string") {
    preset = presetOrOptions;
  }

  const todayYmd = getClinicToday(CLINIC_TIMEZONE);
  const { year, month } = parseYMD(todayYmd);

  switch (preset) {
    case "today":
      return {
        preset: "today",
        startDate: todayYmd,
        endDate: todayYmd,
        label: "Today",
      };

    case "last7days": {
      const start = addDays(todayYmd, -6);
      return {
        preset: "last7days",
        startDate: start,
        endDate: todayYmd,
        label: "Last 7 Days",
      };
    }

    case "last30days": {
      const start = addDays(todayYmd, -29);
      return {
        preset: "last30days",
        startDate: start,
        endDate: todayYmd,
        label: "Last 30 Days",
      };
    }

    case "currentMonth": {
      // 1st of current month
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      return {
        preset: "currentMonth",
        startDate: start,
        endDate: todayYmd,
        label: "Current Month",
      };
    }

    case "previousMonth": {
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
      // Last day of previous month
      const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      const end = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(
        daysInPrevMonth
      ).padStart(2, "0")}`;
      return {
        preset: "previousMonth",
        startDate: start,
        endDate: end,
        label: "Previous Month",
      };
    }

    case "custom": {
      const validStart = isValidDateString(effectiveStart)
        ? effectiveStart!
        : addDays(todayYmd, -29);
      const validEnd = isValidDateString(effectiveEnd) ? effectiveEnd! : todayYmd;

      // Ensure start <= end
      if (validStart > validEnd) {
        return {
          preset: "custom",
          startDate: validEnd,
          endDate: validStart,
          label: `Custom (${validEnd} to ${validStart})`,
        };
      }

      return {
        preset: "custom",
        startDate: validStart,
        endDate: validEnd,
        label: `Custom (${validStart} to ${validEnd})`,
      };
    }

    default:
      return {
        preset: "last30days",
        startDate: addDays(todayYmd, -29),
        endDate: todayYmd,
        label: "Last 30 Days",
      };
  }
}

/**
 * Generates an ordered array of daily date strings (YYYY-MM-DD) between start and end inclusive.
 * Max limit safeguard: 90 days for trends to prevent UI chart overload.
 */
export function generateDailyDateSeries(
  startDateYmd: string,
  endDateYmd: string,
  maxDays = 90
): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = [];
  let current = startDateYmd;
  let count = 0;

  while (current <= endDateYmd && count < maxDays) {
    const { year, month, day } = parseYMD(current);
    const d = new Date(Date.UTC(year, month - 1, day));
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);

    result.push({ date: current, label });
    current = addDays(current, 1);
    count++;
  }

  return result;
}
