import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBdPhoneNumber,
  maskPhoneNumber,
  hashPhoneNumber,
  getNormalizedBdPhoneNumber,
} from "../src/lib/sms/phone-utils";
import { renderFollowUpReminderMessage } from "../src/lib/sms/sms-templates";
import { MockSmsProvider } from "../src/lib/sms/providers/mock-sms-provider";
import { MockSmsReminderRepository } from "../src/lib/data/repositories/mock-sms-reminder-repository";
import { MockFollowUpRepository } from "../src/lib/data/repositories/mock-follow-up-repository";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { SmsReminderService } from "../src/lib/sms/sms-reminder-service";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
} from "../src/lib/data";
import { Patient } from "../src/types/patient";
import { FollowUp } from "../src/types/follow-up";

describe("Phase 25 — Secure SMS Follow-up Reminder System", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
    MockStorage.clear();
  });

  describe("1. Bangladesh Phone Number Normalization & Privacy", () => {
    it("should correctly normalize various valid Bangladesh mobile number formats to E.164 (+880)", () => {
      assert.equal(normalizeBdPhoneNumber("01712345678").isValid, true);
      assert.equal(getNormalizedBdPhoneNumber("01712345678"), "+8801712345678");
      assert.equal(getNormalizedBdPhoneNumber("01812-345678"), "+8801812345678");
      assert.equal(getNormalizedBdPhoneNumber("+8801912345678"), "+8801912345678");
      assert.equal(getNormalizedBdPhoneNumber("8801312345678"), "+8801312345678");
      assert.equal(getNormalizedBdPhoneNumber("01512 345678"), "+8801512345678");
      assert.equal(getNormalizedBdPhoneNumber("01612345678"), "+8801612345678");
      assert.equal(getNormalizedBdPhoneNumber("01412345678"), "+8801412345678");
    });

    it("should reject invalid, incomplete, or foreign phone numbers", () => {
      assert.equal(getNormalizedBdPhoneNumber("12345"), null);
      assert.equal(getNormalizedBdPhoneNumber("01212345678"), null); // Invalid prefix 012
      assert.equal(getNormalizedBdPhoneNumber("01012345678"), null); // Invalid prefix 010
      assert.equal(getNormalizedBdPhoneNumber("+14155552671"), null); // US number
      assert.equal(getNormalizedBdPhoneNumber(""), null);
      assert.equal(getNormalizedBdPhoneNumber(undefined), null);
    });

    it("should securely mask phone numbers while preserving network code and terminal digits", () => {
      assert.equal(maskPhoneNumber("+8801712345678"), "+88017****5678");
      assert.equal(maskPhoneNumber("01812345678"), "0181****5678");
      assert.equal(maskPhoneNumber(null), "—");
      assert.equal(maskPhoneNumber(undefined), "—");
    });

    it("should produce deterministic SHA-256 phone hashes for privacy audits", () => {
      const hash1 = hashPhoneNumber("+8801712345678");
      const hash2 = hashPhoneNumber("+8801712345678");
      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
    });
  });

  describe("2. Privacy-Preserving Reminder Message Templates", () => {
    it("should render clean reminder message without clinical diagnosis or medications", () => {
      const msg = renderFollowUpReminderMessage({
        followUpDate: "2026-11-20",
        followUpTime: "16:30",
        chamberName: "Dhaka Chamber",
      });

      assert.ok(msg.includes("Dr. Mohammad Rubaiath Tashfin"));
      assert.ok(msg.includes("Nov 20, 2026"));
      assert.ok(msg.includes("16:30"));
      assert.ok(msg.includes("Dhaka Chamber"));
      assert.ok(msg.includes("STOP to opt out"));

      // Strictly verify absence of sensitive clinical information
      assert.ok(!msg.toLowerCase().includes("diagnosis"));
      assert.ok(!msg.toLowerCase().includes("hypertension"));
      assert.ok(!msg.toLowerCase().includes("prescription"));
      assert.ok(!msg.toLowerCase().includes("medication"));
    });

    it("should gracefully omit appointment time when no specific time is scheduled", () => {
      const msg = renderFollowUpReminderMessage({
        followUpDate: "2026-11-22",
        chamberName: "Rangpur Chamber",
      });

      assert.ok(msg.includes("scheduled follow-up on Nov 22, 2026"));
      assert.ok(!msg.includes("undefined"));
      assert.ok(!msg.includes("at 12:00 AM"));
      assert.ok(!msg.includes("at 10:00 AM"));
    });
  });

  describe("3. Zero Fabricated Times Rule", () => {
    const reminderService = new SmsReminderService(
      new MockSmsReminderRepository(),
      new MockSmsProvider()
    );

    it("should schedule both 24h_before and 3h_before when explicit scheduledTime is present", () => {
      const timing24h = reminderService.calculateReminderTime(
        "2026-11-15",
        "15:00",
        "24h_before"
      );
      const timing3h = reminderService.calculateReminderTime(
        "2026-11-15",
        "15:00",
        "3h_before"
      );

      assert.ok(timing24h !== null);
      assert.ok(timing3h !== null);
      assert.equal(timing24h?.hasExplicitTime, true);
      assert.equal(timing3h?.hasExplicitTime, true);

      // Verify 21h difference between 24h_before and 3h_before
      const ms24 = new Date(timing24h!.sendIso).getTime();
      const ms3 = new Date(timing3h!.sendIso).getTime();
      assert.equal(ms3 - ms24, 21 * 60 * 60 * 1000);
    });

    it("should strictly return NULL for 3h_before when appointment time is not specified", () => {
      const timing3hWithoutTime = reminderService.calculateReminderTime(
        "2026-11-15",
        undefined,
        "3h_before"
      );
      const timing3hWithEmptyTime = reminderService.calculateReminderTime(
        "2026-11-15",
        "",
        "3h_before"
      );

      assert.equal(timing3hWithoutTime, null);
      assert.equal(timing3hWithEmptyTime, null);

      // 24h_before should still be scheduled (clinic default 10:00 AM day before)
      const timing24h = reminderService.calculateReminderTime(
        "2026-11-15",
        undefined,
        "24h_before"
      );
      assert.ok(timing24h !== null);
      assert.equal(timing24h?.hasExplicitTime, false);
    });
  });

  describe("4. Patient Consent Enforcement", () => {
    it("should schedule reminders only when patient has explicitly opted in", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      const service = new SmsReminderService(reminderRepo, provider);

      const optedInPatient: Patient = {
        id: "p-opted-in-1",
        patientId: "DH-000001",
        name: "Consent Tester In",
        dateOfBirth: "1990-01-01",
        age: 36,
        gender: "male",
        phone: "01711112222",
        smsConsentStatus: "opted_in",
        smsConsentAt: new Date().toISOString(),
        smsConsentSource: "registration",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const followUp: FollowUp = {
        id: "fu-consent-1",
        patientId: optedInPatient.id,
        scheduledDate: "2026-12-01",
        scheduledTime: "10:30",
        reason: "Cardio follow-up",
        status: "scheduled",
        priority: "routine",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await service.scheduleRemindersForFollowUp(followUp, optedInPatient);
      assert.equal(result.scheduled.length, 2); // 24h and 3h
      assert.equal(result.skipped.length, 0);
      assert.equal(result.scheduled[0].status, "scheduled");
      assert.equal(result.scheduled[1].status, "scheduled");
    });

    it("should mark reminders as skipped when patient is opted_out or unknown", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      const service = new SmsReminderService(reminderRepo, provider);

      const optedOutPatient: Patient = {
        id: "p-opted-out-1",
        patientId: "DH-000002",
        name: "Consent Tester Out",
        dateOfBirth: "1985-05-05",
        age: 41,
        gender: "female",
        phone: "01811113333",
        smsConsentStatus: "opted_out",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const followUp: FollowUp = {
        id: "fu-consent-2",
        patientId: optedOutPatient.id,
        scheduledDate: "2026-12-01",
        scheduledTime: "11:00",
        reason: "Routine review",
        status: "scheduled",
        priority: "routine",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await service.scheduleRemindersForFollowUp(followUp, optedOutPatient);
      assert.equal(result.scheduled.length, 0);
      assert.equal(result.skipped.length, 2);
      assert.equal(result.skipped[0].status, "skipped");
      assert.ok(result.skipped[0].failureReason?.includes("not opted in"));
    });
  });

  describe("5. Idempotent Deduplication & Cancellation Cascades", () => {
    it("should avoid duplicate reminders when scheduling is called repeatedly", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      const service = new SmsReminderService(reminderRepo, provider);

      const patient: Patient = {
        id: "p-idemp-1",
        patientId: "DH-000003",
        name: "Idempotency Patient",
        dateOfBirth: "1992-02-02",
        age: 34,
        gender: "male",
        phone: "01911114444",
        smsConsentStatus: "opted_in",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const followUp: FollowUp = {
        id: "fu-idemp-1",
        patientId: patient.id,
        scheduledDate: "2026-12-05",
        scheduledTime: "14:00",
        reason: "Blood pressure check",
        status: "scheduled",
        priority: "routine",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call 1
      const res1 = await service.scheduleRemindersForFollowUp(followUp, patient);
      assert.equal(res1.scheduled.length, 2);

      // Call 2
      const res2 = await service.scheduleRemindersForFollowUp(followUp, patient);
      assert.equal(res2.scheduled.length, 2);

      // Verify database row count is still exactly 2
      const allReminders = await reminderRepo.getRemindersForFollowUp(followUp.id);
      assert.equal(allReminders.length, 2);
    });

    it("should cancel all pending reminders when follow-up is cancelled", async () => {
      const reminderRepo = new MockSmsReminderRepository();

      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Cascade Patient",
        dateOfBirth: "1988-08-08",
        gender: "female",
        phone: "01722223333",
        smsConsentStatus: "opted_in",
      });

      const followUpRepo = new MockFollowUpRepository(patientRepo);
      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        scheduledDate: "2026-12-10",
        scheduledTime: "15:00",
        reason: "Cardiac assessment",
      });

      // Verify reminders created
      const activeReminders = await reminderRepo.getRemindersForFollowUp(followUp.id);
      assert.ok(activeReminders.length >= 1);

      // Cancel the follow-up
      await followUpRepo.cancelFollowUp(followUp.id, {
        cancellationReason: "Patient travel conflict",
      });

      // Verify reminders are cancelled
      const afterCancel = await reminderRepo.getRemindersForFollowUp(followUp.id);
      assert.ok(afterCancel.length >= 1);
      assert.ok(afterCancel.every((r) => r.status === "cancelled"));
    });
  });

  describe("6. Outbound Dispatch, Transient Retries & Queue Processing", () => {
    it("should successfully dispatch due reminders via mock provider", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      const service = new SmsReminderService(reminderRepo, provider);

      // Create due reminder scheduled in the past
      const pastTime = new Date(Date.now() - 10000).toISOString();
      await reminderRepo.createReminder({
        followUpId: "fu-queue-1",
        patientId: "pt-queue-1",
        recipientPhone: "+8801712345678",
        recipientPhoneMasked: "+88017****5678",
        recipientPhoneHash: hashPhoneNumber("+8801712345678"),
        messageContent: "Test reminder message",
        reminderType: "24h_before",
        scheduledFor: pastTime,
        status: "pending",
        idempotencyKey: "fu_fu-queue-1_24h_before",
      });

      const queueResult = await service.processPendingReminders({ now: new Date() });
      assert.equal(queueResult.processed, 1);
      assert.equal(queueResult.sent, 1);
      assert.equal(queueResult.failed, 0);

      const reminders = await reminderRepo.getRemindersForFollowUp("fu-queue-1");
      assert.equal(reminders[0].status, "sent");
      assert.ok(reminders[0].providerMessageId);
    });

    it("should handle transient failures by incrementing retry count and scheduling backoff", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      // Inject simulated transient failure
      provider.setSimulatedFailure("transient", "Network gateway timeout");

      const service = new SmsReminderService(reminderRepo, provider);

      const pastTime = new Date(Date.now() - 10000).toISOString();
      const created = await reminderRepo.createReminder({
        followUpId: "fu-transient-1",
        patientId: "pt-transient-1",
        recipientPhone: "+8801712345678",
        recipientPhoneMasked: "+88017****5678",
        recipientPhoneHash: hashPhoneNumber("+8801712345678"),
        messageContent: "Test retry reminder",
        reminderType: "24h_before",
        scheduledFor: pastTime,
        status: "pending",
        idempotencyKey: "fu_fu-transient-1_24h_before",
      });

      const queueResult = await service.processPendingReminders({ now: new Date() });
      assert.equal(queueResult.failed, 1);

      const updated = await reminderRepo.getReminderById(created.id);
      assert.equal(updated?.retryCount, 1);
      assert.equal(updated?.status, "pending"); // scheduled for retry
      assert.ok(updated?.failureReason?.includes("Transient error (attempt 1/3)"));
    });

    it("should allow doctor to manually retry a failed reminder", async () => {
      const reminderRepo = new MockSmsReminderRepository();
      const provider = new MockSmsProvider();
      const service = new SmsReminderService(reminderRepo, provider);

      const failedReminder = await reminderRepo.createReminder({
        followUpId: "fu-retry-man-1",
        patientId: "pt-retry-man-1",
        recipientPhone: "+8801712345678",
        recipientPhoneMasked: "+88017****5678",
        recipientPhoneHash: hashPhoneNumber("+8801712345678"),
        messageContent: "Manual retry test",
        reminderType: "24h_before",
        scheduledFor: new Date().toISOString(),
        status: "failed",
        failureReason: "Prior connection timed out",
        idempotencyKey: "fu_fu-retry-man-1_24h_before",
      });

      // Provider works normally now
      const result = await service.retryReminder(failedReminder.id);
      assert.equal(result.status, "sent");
      assert.ok(result.providerMessageId);
    });
  });
});
