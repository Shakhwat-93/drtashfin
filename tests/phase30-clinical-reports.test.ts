import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveDateRange,
  toUtcTimestampRange,
  generateDailyDateSeries,
  isValidDateString,
  CLINIC_TIMEZONE,
} from "../src/lib/reports/date-range-utils";
import {
  sanitizeCsvCell,
  formatCsv,
  generateReportCsv,
} from "../src/lib/reports/csv-export-utils";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
  getReportRepository,
  getPatientRepository,
  getConsultationRepository,
  getPrescriptionRepository,
  getFollowUpRepository,
  getDiagnosticReportRepository,
  getProcedureRepository,
  getDischargeRepository,
  getSmsReminderRepository,
} from "../src/lib/data";
import { GET as getDashboardRoute } from "../src/app/api/reports/dashboard/route";
import { GET as getReportTypeRoute } from "../src/app/api/reports/[type]/route";
import { GET as getExportRoute } from "../src/app/api/reports/export/route";
import { NextRequest } from "next/server";

describe("Phase 30: Clinical Dashboard & Medical Reports", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Date Range Utilities & Asia/Dhaka Timezone Bounds", () => {
    it("enforces clinic timezone as Asia/Dhaka (UTC+6)", () => {
      assert.equal(CLINIC_TIMEZONE, "Asia/Dhaka");
    });

    it("correctly validates YYYY-MM-DD date strings", () => {
      assert.equal(isValidDateString("2026-10-15"), true);
      assert.equal(isValidDateString("2026-02-28"), true);
      assert.equal(isValidDateString("invalid-date"), false);
      assert.equal(isValidDateString("2026-13-40"), false);
      assert.equal(isValidDateString(""), false);
    });

    it("resolves today preset accurately", () => {
      const range = resolveDateRange({ preset: "today" });
      assert.equal(range.preset, "today");
      assert.equal(range.startDate, range.endDate);
      assert.ok(isValidDateString(range.startDate));
    });

    it("resolves last7days and last30days presets with valid ordering", () => {
      const range7 = resolveDateRange({ preset: "last7days" });
      assert.equal(range7.preset, "last7days");
      assert.ok(range7.startDate <= range7.endDate);

      const range30 = resolveDateRange({ preset: "last30days" });
      assert.equal(range30.preset, "last30days");
      assert.ok(range30.startDate <= range30.endDate);
    });

    it("resolves currentMonth and previousMonth presets", () => {
      const curMonth = resolveDateRange({ preset: "currentMonth" });
      assert.equal(curMonth.preset, "currentMonth");
      assert.ok(curMonth.startDate.endsWith("-01"));

      const prevMonth = resolveDateRange({ preset: "previousMonth" });
      assert.equal(prevMonth.preset, "previousMonth");
      assert.ok(prevMonth.startDate.endsWith("-01"));
      assert.ok(prevMonth.startDate < curMonth.startDate);
    });

    it("resolves custom date range when valid dates are provided", () => {
      const custom = resolveDateRange({
        preset: "custom",
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      });
      assert.equal(custom.preset, "custom");
      assert.equal(custom.startDate, "2026-05-01");
      assert.equal(custom.endDate, "2026-05-31");
    });

    it("swaps custom dates if startDate is after endDate", () => {
      const swapped = resolveDateRange({
        preset: "custom",
        startDate: "2026-06-30",
        endDate: "2026-06-01",
      });
      assert.equal(swapped.startDate, "2026-06-01");
      assert.equal(swapped.endDate, "2026-06-30");
    });

    it("generates exact UTC ISO timestamps for Asia/Dhaka boundaries", () => {
      const { startIso, endIso } = toUtcTimestampRange("2026-10-15", "2026-10-15");
      // 2026-10-15T00:00:00+06:00 is 2026-10-14T18:00:00.000Z
      assert.equal(startIso, "2026-10-14T18:00:00.000Z");
      // 2026-10-15T23:59:59.999+06:00 is 2026-10-15T17:59:59.999Z
      assert.equal(endIso, "2026-10-15T17:59:59.999Z");
    });

    it("generates continuous daily date series", () => {
      const series = generateDailyDateSeries("2026-10-01", "2026-10-05");
      assert.deepEqual(
        series.map((s) => s.date),
        [
          "2026-10-01",
          "2026-10-02",
          "2026-10-03",
          "2026-10-04",
          "2026-10-05",
        ]
      );
    });
  });

  describe("2. CSV Export Formatting & Formula Injection Protection", () => {
    it("neutralizes formula injection characters (=, +, -, @)", () => {
      assert.equal(sanitizeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
      assert.equal(sanitizeCsvCell("+123456"), "'+123456");
      assert.equal(sanitizeCsvCell("-cmd|' /C calc'!A0"), "'-cmd|' /C calc'!A0");
      assert.equal(sanitizeCsvCell("@SUM(B1)"), "'@SUM(B1)");
    });

    it("escapes fields containing commas, quotes, and newlines according to RFC 4180", () => {
      assert.equal(sanitizeCsvCell('Dr. "Tashfin" Rahman'), '"Dr. ""Tashfin"" Rahman"');
      assert.equal(sanitizeCsvCell("Dhaka, Bangladesh"), '"Dhaka, Bangladesh"');
      assert.equal(sanitizeCsvCell("Line 1\nLine 2"), '"Line 1\nLine 2"');
    });

    it("leaves normal alphanumeric text untouched", () => {
      assert.equal(sanitizeCsvCell("PT-000013"), "PT-000013");
      assert.equal(sanitizeCsvCell("Dr. Tashfin"), "Dr. Tashfin");
      assert.equal(sanitizeCsvCell(42), "42");
      assert.equal(sanitizeCsvCell(null), "");
      assert.equal(sanitizeCsvCell(undefined), "");
    });

    it("includes UTF-8 BOM in formatted CSV output", () => {
      const csv = formatCsv([
        ["Header 1", "Header 2"],
        ["Value 1", "Value 2"],
      ]);
      assert.ok(csv.startsWith("\uFEFF"));
      assert.ok(csv.includes("Header 1,Header 2\r\nValue 1,Value 2"));
    });

    it("generates CSV files for all 7 report types without error", () => {
      const types = [
        "patient-activity",
        "consultations",
        "prescriptions",
        "follow-ups",
        "diagnostics-procedures",
        "discharges",
        "sms-delivery",
      ] as const;

      for (const t of types) {
        const result = generateReportCsv(t, []);
        assert.ok(result.filename.endsWith(".csv"));
        assert.ok(result.csv.startsWith("\uFEFF"));
      }
    });
  });

  describe("3. Report Repository & Dashboard Metrics", () => {
    it("retrieves dashboard data with lifetime totals and period metrics", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const dashboard = await repo.getClinicalDashboardData("all", range);

      assert.ok(dashboard);
      assert.equal(dashboard.chamberId, "all");
      assert.equal(dashboard.chamberLabel, "All Chambers");
      assert.ok(typeof dashboard.lifetime.totalPatients === "number");
      assert.ok(typeof dashboard.lifetime.totalConsultations === "number");
      assert.ok(typeof dashboard.lifetime.totalPrescriptions === "number");
      assert.ok(typeof dashboard.range.consultationsCount === "number");
      assert.ok(Array.isArray(dashboard.dailyTrends));
      assert.ok(dashboard.dailyTrends.length > 0);
    });

    it("queries paginated patient-activity report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getPatientActivityReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
      assert.equal(result.page, 1);
      assert.equal(result.pageSize, 10);
    });

    it("queries paginated consultations report with search filter", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getConsultationReport({
        chamberId: "all",
        dateRange: range,
        searchQuery: "Hypertension",
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });

    it("queries paginated prescriptions report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getPrescriptionReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });

    it("queries paginated follow-ups report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getFollowUpReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });

    it("queries paginated diagnostics and procedures report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getDiagnosticProcedureReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });

    it("queries paginated discharges report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getDischargeReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });

    it("queries paginated SMS delivery report", async () => {
      const repo = getReportRepository();
      const range = resolveDateRange({ preset: "last30days" });
      const result = await repo.getSmsDeliveryReport({
        chamberId: "all",
        dateRange: range,
        page: 1,
        pageSize: 10,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });
  });

  describe("4. API Route Security & Authorization Guards", () => {
    it("returns 401 Unauthorized for unauthenticated requests to /api/reports/dashboard", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/dashboard");
      const res = await getDashboardRoute(req);
      assert.equal(res.status, 401);
    });

    it("returns 401 Unauthorized for unauthenticated requests to /api/reports/[type]", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/patient-activity");
      const res = await getReportTypeRoute(req, {
        params: Promise.resolve({ type: "patient-activity" }),
      });
      assert.equal(res.status, 401);
    });

    it("returns 401 Unauthorized for unauthenticated requests to /api/reports/export", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/export?type=prescriptions");
      const res = await getExportRoute(req);
      assert.equal(res.status, 401);
    });
  });
});
