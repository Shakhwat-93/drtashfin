/**
 * Medical Practice Date & Calendar Utilities.
 * Uses the clinic's established timezone ("Asia/Dhaka", UTC+6) consistently
 * to ensure all date boundaries (Today, Overdue, Upcoming) match local clinical hours.
 */

export const CLINIC_TIMEZONE = "Asia/Dhaka";

/**
 * Returns the current date in YYYY-MM-DD string format in the clinic timezone.
 */
export function getClinicToday(timeZone: string = CLINIC_TIMEZONE): string {
  const now = new Date();
  return formatDateToYMD(now, timeZone);
}

/**
 * Formats a given Date instance into YYYY-MM-DD in the specified timezone.
 */
export function formatDateToYMD(date: Date, timeZone: string = CLINIC_TIMEZONE): string {
  // Use Intl.DateTimeFormat to reliably parse year, month, and day in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // Returns YYYY-MM-DD
}

/**
 * Parses YYYY-MM-DD string into components [year, month, day]
 */
export function parseYMD(ymdStr: string): { year: number; month: number; day: number } {
  const parts = ymdStr.split("-").map(Number);
  return {
    year: parts[0] || 2026,
    month: parts[1] || 1, // 1-indexed (1 = Jan)
    day: parts[2] || 1,
  };
}

/**
 * Formats a YYYY-MM-DD string into a human-readable display string.
 * e.g., "Wed, Oct 15, 2026"
 */
export function formatDisplayDate(
  ymdStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  if (!ymdStr) return "";
  const { year, month, day } = parseYMD(ymdStr);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

/**
 * Formats appointment time safely without inventing missing times.
 */
export function formatAppointmentTime(timeStr?: string | null): string {
  if (!timeStr || !timeStr.trim()) return "";
  return timeStr.trim();
}

/**
 * Checks if a YYYY-MM-DD string equals today in the clinic timezone.
 */
export function isTodayInClinic(ymdStr: string, timeZone: string = CLINIC_TIMEZONE): boolean {
  if (!ymdStr) return false;
  return ymdStr === getClinicToday(timeZone);
}

/**
 * Checks if a YYYY-MM-DD string is before today in the clinic timezone.
 */
export function isOverdueInClinic(ymdStr: string, timeZone: string = CLINIC_TIMEZONE): boolean {
  if (!ymdStr) return false;
  return ymdStr < getClinicToday(timeZone);
}

/**
 * Calculates day difference from today:
 * - Positive: days in the future
 * - Negative: days in the past (overdue)
 * - 0: today
 */
export function calculateDaysDiff(ymdStr: string, baseDateStr?: string): number {
  const todayStr = baseDateStr || getClinicToday();
  const { year: y1, month: m1, day: d1 } = parseYMD(ymdStr);
  const { year: y2, month: m2, day: d2 } = parseYMD(todayStr);

  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);

  const diffMs = t1 - t2;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  day: number;
  dayNumber: number;
  weekdayIndex: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Generates calendar grid cells for a given year and month (1-indexed month: 1=Jan, 12=Dec).
 * Standard 7-column layout starting on Sunday (index 0).
 */
export function getMonthGrid(year: number, month: number): CalendarDayCell[] {
  const todayStr = getClinicToday();

  // First day of target month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startingDayOfWeek = firstDayOfMonth.getUTCDay();

  // Total days in target month
  const daysInCurrentMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Days in previous month
  const daysInPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: CalendarDayCell[] = [];

  // 1. Prepend days from previous month
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthDate = new Date(Date.UTC(year, month - 2, day));
    const dateStr = formatDateToYMD(prevMonthDate, "UTC");
    cells.push({
      dateStr,
      day,
      dayNumber: day,
      weekdayIndex: prevMonthDate.getUTCDay(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const curDate = new Date(Date.UTC(year, month - 1, day));
    const dateStr = formatDateToYMD(curDate, "UTC");
    cells.push({
      dateStr,
      day,
      dayNumber: day,
      weekdayIndex: curDate.getUTCDay(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  // 3. Postpend days to complete the trailing week(s) (always 35 or 42 cells)
  const totalGridCells = cells.length > 35 ? 42 : 35;
  const remainingCells = totalGridCells - cells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDate = new Date(Date.UTC(year, month, day));
    const dateStr = formatDateToYMD(nextMonthDate, "UTC");
    cells.push({
      dateStr,
      day,
      dayNumber: day,
      weekdayIndex: nextMonthDate.getUTCDay(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  return cells;
}

/**
 * Returns 7 days for the week containing the specified baseDate (YYYY-MM-DD),
 * starting on Sunday.
 */
export function getWeekDays(baseDateStr: string): CalendarDayCell[] {
  const todayStr = getClinicToday();
  const { year, month, day } = parseYMD(baseDateStr);
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = baseDate.getUTCDay(); // 0 = Sun

  const days: CalendarDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const offset = i - dayOfWeek;
    const d = new Date(Date.UTC(year, month - 1, day + offset));
    const dateStr = formatDateToYMD(d, "UTC");
    const dNum = d.getUTCDate();
    days.push({
      dateStr,
      day: dNum,
      dayNumber: dNum,
      weekdayIndex: d.getUTCDay(),
      isCurrentMonth: d.getUTCMonth() === month - 1,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  return days;
}

/**
 * Adds or subtracts months from a year/month pair.
 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
export function addDays(ymdStr: string, days: number): string {
  const { year, month, day } = parseYMD(ymdStr);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateToYMD(d, "UTC");
}
