import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setRepositoryProvider,
  getFollowUpRepository,
  getPatientRepository,
  getChamberRepository,
  resetRepositoryInstances,
} from "../src/lib/data";
import {
  getClinicToday,
  formatAppointmentTime,
  isOverdueInClinic,
  isTodayInClinic,
  getMonthGrid,
  getWeekDays,
  addMonths,
  addDays,
} from "../src/lib/date-utils";
import { CreateFollowUpDTO } from "../src/types/follow-up";

describe("Phase 24: Follow-up Calendar, Daily Schedule & Doctor Alerts", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Calendar Month Grid & Week Day Calculations", () => {
    it("generates 35 or 42 grid cells with exact weekday alignment and previous/next month days", () => {
      // October 2026: starts on Thursday (weekday 4), 31 days
      const grid = getMonthGrid(2026, 10);
      assert.ok(grid.length === 35 || grid.length === 42, "Grid must be 5 or 6 complete weeks (35 or 42 cells)");

      // Check first cell of current month
      const firstCurrentMonthCell = grid.find((c) => c.isCurrentMonth && c.day === 1);
      assert.ok(firstCurrentMonthCell, "Day 1 of October must exist");
      assert.equal(firstCurrentMonthCell.dateStr, "2026-10-01");

      // Verify preceding cells belong to previous month (September)
      const firstIndex = grid.indexOf(firstCurrentMonthCell);
      if (firstIndex > 0) {
        assert.equal(grid[0].isCurrentMonth, false);
        assert.ok(grid[0].dateStr.startsWith("2026-09-"), "Preceding cell must be in September");
      }

      // Check last day of current month (31)
      const lastCurrentMonthCell = grid.find((c) => c.isCurrentMonth && c.day === 31);
      assert.ok(lastCurrentMonthCell, "Day 31 of October must exist");
      assert.equal(lastCurrentMonthCell.dateStr, "2026-10-31");
    });

    it("handles February in leap year (2024 = 29 days) and non-leap year (2025 = 28 days)", () => {
      const leapGrid = getMonthGrid(2024, 2);
      const leapDays = leapGrid.filter((c) => c.isCurrentMonth);
      assert.equal(leapDays.length, 29, "Feb 2024 must have 29 days");

      const nonLeapGrid = getMonthGrid(2025, 2);
      const nonLeapDays = nonLeapGrid.filter((c) => c.isCurrentMonth);
      assert.equal(nonLeapDays.length, 28, "Feb 2025 must have 28 days");
    });

    it("generates exactly 7 days for week view anchored around Sunday to Saturday", () => {
      const week = getWeekDays("2026-10-14");
      assert.equal(week.length, 7, "Week must have exactly 7 days");
      assert.equal(week[0].weekdayIndex, 0, "First day must be Sunday");
      assert.equal(week[6].weekdayIndex, 6, "Last day must be Saturday");

      // Check that 2026-10-14 (Wednesday) is present in the week
      const targetDay = week.find((d) => d.dateStr === "2026-10-14");
      assert.ok(targetDay, "2026-10-14 must be present in the week");
      assert.equal(targetDay.weekdayIndex, 3, "Wednesday has index 3");
    });

    it("addMonths and addDays calculate dates correctly across month and year boundaries", () => {
      const nextMonth = addMonths(2026, 12, 1);
      assert.deepEqual(nextMonth, { year: 2027, month: 1 }, "Dec 2026 + 1 month = Jan 2027");

      const prevMonth = addMonths(2026, 1, -1);
      assert.deepEqual(prevMonth, { year: 2025, month: 12 }, "Jan 2026 - 1 month = Dec 2025");

      const nextDay = addDays("2026-12-31", 1);
      assert.equal(nextDay, "2027-01-01", "2026-12-31 + 1 day = 2027-01-01");

      const prevDay = addDays("2026-03-01", -1);
      assert.equal(prevDay, "2026-02-28", "2026-03-01 - 1 day in non-leap year = 2026-02-28");
    });
  });

  describe("2. Clinic Timezone & No Fabricated Appointment Times", () => {
    it("getClinicToday returns a valid YYYY-MM-DD string in Asia/Dhaka time", () => {
      const today = getClinicToday();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/, "Must be valid ISO date YYYY-MM-DD");
    });

    it("never fabricates appointment times when time is unassigned", () => {
      assert.equal(formatAppointmentTime(undefined), "", "Undefined time must return empty string");
      assert.equal(formatAppointmentTime(null as unknown as string), "", "Null time must return empty string");
      assert.equal(formatAppointmentTime(""), "", "Empty string time must return empty string");

      // Valid times are properly preserved
      assert.equal(formatAppointmentTime("10:00 AM"), "10:00 AM");
      assert.equal(formatAppointmentTime("02:30 PM"), "02:30 PM");
    });

    it("isOverdueInClinic and isTodayInClinic correctly compare against clinic date", () => {
      const today = getClinicToday();
      assert.equal(isTodayInClinic(today), true);
      assert.equal(isOverdueInClinic(today), false, "Today cannot be overdue");

      const pastDate = addDays(today, -5);
      assert.equal(isOverdueInClinic(pastDate), true, "Past date must be overdue");
      assert.equal(isTodayInClinic(pastDate), false);

      const futureDate = addDays(today, 5);
      assert.equal(isOverdueInClinic(futureDate), false, "Future date is not overdue");
      assert.equal(isTodayInClinic(futureDate), false);
    });
  });

  describe("3. Chamber-Aware Follow-up Repository & Joined Metadata", () => {
    it("creates follow-ups and retrieves them with patient and chamber details populated", async () => {
      const patientRepo = getPatientRepository();
      const chamberRepo = getChamberRepository();
      const followUpRepo = getFollowUpRepository();

      const chambers = await chamberRepo.getChambers();
      const dhakaChamber = chambers.find((c) => c.code.toLowerCase() === "dhaka");
      assert.ok(dhakaChamber, "Dhaka chamber must exist");

      // Register patient in Dhaka chamber
      const patient = await patientRepo.createPatient({
        name: "Abdur Rahman",
        dateOfBirth: "1980-05-15",
        gender: "male",
        phone: "+8801711223344",
        chamberId: dhakaChamber.id,
      });

      const today = getClinicToday();

      // Schedule follow-up with no appointment time
      const dto: CreateFollowUpDTO = {
        patientId: patient.id,
        scheduledDate: today,
        reason: "Review blood pressure after 2 weeks of ACE inhibitor",
        priority: "high",
        chamberId: dhakaChamber.id,
      };

      const created = await followUpRepo.createFollowUp(dto);
      assert.ok(created.id, "Follow-up must have an ID");
      assert.equal(created.scheduledTime, undefined, "Must not fabricate a time");
      assert.equal(created.status, "scheduled");

      // Fetch follow-up and verify joined metadata
      const retrieved = await followUpRepo.getFollowUpById(created.id);
      assert.ok(retrieved);
      assert.equal(retrieved.patientName, "Abdur Rahman", "Joined patientName must be populated");
      assert.equal(retrieved.chamberName, "Dhaka Chamber", "Joined chamberName must be populated");
      assert.equal(retrieved.chamberCode?.toLowerCase(), "dhaka", "Joined chamberCode must be populated");
    });

    it("filters follow-ups strictly by chamber without cross-chamber pollution", async () => {
      const patientRepo = getPatientRepository();
      const chamberRepo = getChamberRepository();
      const followUpRepo = getFollowUpRepository();

      const chambers = await chamberRepo.getChambers();
      const dhaka = chambers.find((c) => c.code.toLowerCase() === "dhaka")!;
      const rangpur = chambers.find((c) => c.code.toLowerCase() === "rangpur")!;

      const pDhaka = await patientRepo.createPatient({
        name: "Dhaka Patient",
        dateOfBirth: "1985-01-01",
        gender: "male",
        phone: "+8801811223344",
        chamberId: dhaka.id,
      });
      const pRangpur = await patientRepo.createPatient({
        name: "Rangpur Patient",
        dateOfBirth: "1990-02-02",
        gender: "female",
        phone: "+8801911223344",
        chamberId: rangpur.id,
      });

      const today = getClinicToday();

      await followUpRepo.createFollowUp({
        patientId: pDhaka.id,
        scheduledDate: today,
        reason: "Dhaka checkup",
        chamberId: dhaka.id,
      });

      await followUpRepo.createFollowUp({
        patientId: pRangpur.id,
        scheduledDate: today,
        reason: "Rangpur checkup",
        chamberId: rangpur.id,
      });

      // Filter by Dhaka
      const dhakaList = await followUpRepo.getFollowUps({ chamberId: dhaka.id });
      assert.ok(dhakaList.every((f) => f.chamberId === dhaka.id), "All items must belong to Dhaka");
      assert.ok(dhakaList.some((f) => f.patientId === pDhaka.id));
      assert.ok(!dhakaList.some((f) => f.patientId === pRangpur.id), "Rangpur patient must not appear in Dhaka filter");

      // Filter by Rangpur
      const rangpurList = await followUpRepo.getFollowUps({ chamberId: rangpur.id });
      assert.ok(rangpurList.every((f) => f.chamberId === rangpur.id), "All items must belong to Rangpur");
      assert.ok(rangpurList.some((f) => f.patientId === pRangpur.id));
      assert.ok(!rangpurList.some((f) => f.patientId === pDhaka.id), "Dhaka patient must not appear in Rangpur filter");

      // All chambers query returns both
      const allList = await followUpRepo.getFollowUps({ status: "all" });
      assert.ok(allList.some((f) => f.patientId === pDhaka.id));
      assert.ok(allList.some((f) => f.patientId === pRangpur.id));
    });
  });

  describe("4. Doctor In-App Alerts & Notification Engine", () => {
    it("categorizes overdue, due today, and urgent upcoming follow-ups correctly", async () => {
      const patientRepo = getPatientRepository();
      const chamberRepo = getChamberRepository();
      const followUpRepo = getFollowUpRepository();

      const chambers = await chamberRepo.getChambers();
      const chamber = chambers[0];

      const patient = await patientRepo.createPatient({
        name: "Alert Test Patient",
        dateOfBirth: "1988-03-03",
        gender: "male",
        phone: "+8801611223344",
        chamberId: chamber.id,
      });

      const today = getClinicToday();
      const overdueDate = addDays(today, -3);
      const upcomingDate = addDays(today, 2);

      // 1. Overdue follow-up
      const overdueFollowUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: overdueDate,
        reason: "Routine follow-up overdue",
        priority: "routine",
        chamberId: chamber.id,
      });

      // 2. Today follow-up
      const todayFollowUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: today,
        reason: "Follow-up due today",
        priority: "high",
        chamberId: chamber.id,
      });

      // 3. Urgent upcoming follow-up (in 2 days)
      const urgentUpcomingFollowUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: upcomingDate,
        reason: "Post-op wound check",
        priority: "urgent",
        chamberId: chamber.id,
      });

      // Verify overdue query
      const overdueList = await followUpRepo.getOverdueFollowUps();
      assert.ok(overdueList.some((f) => f.id === overdueFollowUp.id));
      assert.ok(!overdueList.some((f) => f.id === todayFollowUp.id));

      // Verify upcoming query
      const upcomingList = await followUpRepo.getUpcomingFollowUps();
      assert.ok(upcomingList.some((f) => f.id === todayFollowUp.id));
      assert.ok(upcomingList.some((f) => f.id === urgentUpcomingFollowUp.id));
    });

    it("completed and cancelled follow-ups NEVER trigger active clinical alerts", async () => {
      const patientRepo = getPatientRepository();
      const chamberRepo = getChamberRepository();
      const followUpRepo = getFollowUpRepository();

      const chambers = await chamberRepo.getChambers();
      const chamber = chambers[0];

      const patient = await patientRepo.createPatient({
        name: "Lifecycle Patient",
        dateOfBirth: "1975-04-04",
        gender: "female",
        phone: "+8801511223344",
        chamberId: chamber.id,
      });

      const today = getClinicToday();
      const pastDate = addDays(today, -4);

      // Create a past follow-up that gets completed
      const fCompleted = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: pastDate,
        reason: "Completed follow-up",
        chamberId: chamber.id,
      });
      await followUpRepo.completeFollowUp(fCompleted.id, {
        clinicalOutcome: "improved",
        outcomeNotes: "Patient fully recovered.",
      });

      // Create a past follow-up that gets cancelled
      const fCancelled = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: pastDate,
        reason: "Cancelled follow-up",
        chamberId: chamber.id,
      });
      await followUpRepo.cancelFollowUp(fCancelled.id, {
        cancellationReason: "Patient relocated to another district",
      });

      // Query active overdue
      const overdueList = await followUpRepo.getOverdueFollowUps();
      assert.ok(!overdueList.some((f) => f.id === fCompleted.id), "Completed follow-up must not appear in overdue");
      assert.ok(!overdueList.some((f) => f.id === fCancelled.id), "Cancelled follow-up must not appear in overdue");
    });

    it("dismissing an alert marks it dismissed without altering clinical follow-up status", async () => {
      const patientRepo = getPatientRepository();
      const chamberRepo = getChamberRepository();
      const followUpRepo = getFollowUpRepository();

      const chambers = await chamberRepo.getChambers();
      const chamber = chambers[0];

      const patient = await patientRepo.createPatient({
        name: "Dismiss Patient",
        dateOfBirth: "1992-05-05",
        gender: "male",
        phone: "+8801311223344",
        chamberId: chamber.id,
      });

      const today = getClinicToday();
      const pastDate = addDays(today, -2);

      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: pastDate,
        reason: "Overdue review",
        chamberId: chamber.id,
      });

      const alertId = `overdue-${followUp.id}`;

      // Initially no dismissed alerts
      const initialDismissed = await followUpRepo.getDismissedAlertIds();
      assert.equal(initialDismissed.includes(alertId), false);

      // Dismiss the alert
      await followUpRepo.dismissAlert(alertId);

      // Verify it is recorded as dismissed
      const updatedDismissed = await followUpRepo.getDismissedAlertIds();
      assert.equal(updatedDismissed.includes(alertId), true);

      // Dismissing again is idempotent
      await followUpRepo.dismissAlert(alertId);
      const recheckedDismissed = await followUpRepo.getDismissedAlertIds();
      assert.equal(recheckedDismissed.filter((id) => id === alertId).length, 1);

      // Crucial: The clinical follow-up status must remain "scheduled" and NOT completed/cancelled
      const freshFollowUp = await followUpRepo.getFollowUpById(followUp.id);
      assert.ok(freshFollowUp);
      assert.equal(freshFollowUp.status, "scheduled", "Clinical status must stay 'scheduled'");
    });
  });

  describe("5. Invariants Preservation", () => {
    it("preserves baseline patients and exactly three chambers (DHAKA, NARAYANGANJ, RANGPUR)", async () => {
      const patientRepo = getPatientRepository();
      const p1 = await patientRepo.getPatientById("f83a1b02-5e4c-4158-b59a-112001e9a001");
      assert.ok(p1, "Baseline patient must remain intact");
      assert.equal(p1.patientId, "PT-000001");

      const chamberRepo = getChamberRepository();
      const chambers = await chamberRepo.getChambers();
      assert.equal(chambers.length, 3, "Exactly 3 chambers must exist");
      const codes = chambers.map((c) => c.code.toLowerCase()).sort();
      assert.deepEqual(codes, ["dhaka", "narayanganj", "rangpur"]);
    });
  });
});
