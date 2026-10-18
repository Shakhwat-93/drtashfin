import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_DOCTOR_PROFILE } from "@/config/doctor-profile";
import { renderFollowUpReminderMessage } from "@/lib/sms/sms-templates";
import { generatePrescriptionPdf } from "@/lib/pdf/prescription-pdf-generator";
import { Prescription } from "@/types/prescription";
import { Patient } from "@/types/patient";

describe("Doctor Profile — Dr. Mohammad Rubaiath Tashfin", () => {
  describe("1. Official Doctor Profile Configuration", () => {
    it("should match exact official details for Dr. Mohammad Rubaiath Tashfin", () => {
      assert.equal(OFFICIAL_DOCTOR_PROFILE.fullName, "Dr. Mohammad Rubaiath Tashfin");
      assert.equal(OFFICIAL_DOCTOR_PROFILE.bengaliName, "ডাঃ মোহাম্মদ রুবাইয়াত তাসফিন");
      assert.equal(OFFICIAL_DOCTOR_PROFILE.qualifications, "M.B.B.S., M.S. (Ortho-Surgery)");
      assert.equal(OFFICIAL_DOCTOR_PROFILE.primaryDesignation, "Paediatric Orthopaedic Surgeon");
      assert.equal(
        OFFICIAL_DOCTOR_PROFILE.fellowship,
        "Clinical Fellow — Paediatric Orthopaedic Surgery, India"
      );
      assert.equal(
        OFFICIAL_DOCTOR_PROFILE.additionalTraining,
        "Special Trained in Brachial Plexus Birth Palsy, India"
      );
      assert.equal(
        OFFICIAL_DOCTOR_PROFILE.workplace,
        "Rangpur Medical College & Hospital, Rangpur, Bangladesh"
      );
      assert.equal(OFFICIAL_DOCTOR_PROFILE.doctorCode, "dr-tashfin");
      assert.equal(OFFICIAL_DOCTOR_PROFILE.email, "drtashfinahmed@gmail.com");
    });
  });

  describe("2. SMS Template Doctor Branding", () => {
    it("should render English follow-up reminders with official doctor name", () => {
      const msg = renderFollowUpReminderMessage({
        followUpDate: "2026-11-20",
        followUpTime: "10:00 AM",
        chamberName: "Rangpur Chamber",
        language: "en",
      });
      assert.ok(msg.includes("Dr. Mohammad Rubaiath Tashfin"));
      assert.ok(msg.includes("Rangpur Chamber"));
    });

    it("should render Bengali follow-up reminders with official Bengali doctor name", () => {
      const msg = renderFollowUpReminderMessage({
        followUpDate: "2026-11-20",
        chamberName: "Rangpur Chamber",
        language: "bn",
      });
      assert.ok(msg.includes("ডাঃ মোহাম্মদ রুবাইয়াত তাসফিন"));
    });
  });

  describe("3. Prescription Document Branding", () => {
    it("should generate prescription PDF with official doctor branding", async () => {
      const samplePatient: Patient = {
        id: "p-test-01",
        patientId: "DH-000001",
        name: "Rahim Uddin",
        age: 32,
        gender: "male",
        phone: "+8801711111111",
        bloodGroup: "B+",
        weight: 68,
        dateOfBirth: "1994-05-15",
        createdAt: "2026-10-18T10:00:00Z",
        updatedAt: "2026-10-18T10:00:00Z",
      };

      const samplePrescription: Prescription = {
        id: "rx-test-01",
        prescriptionCode: "RX-2026-0001",
        patientId: "DH-000001",
        doctorId: "dr-tashfin",
        prescriptionDate: "2026-10-18",
        status: "draft",
        items: [
          {
            id: "item-01",
            prescriptionId: "rx-test-01",
            brandName: "Napa Extend",
            genericName: "Paracetamol",
            strength: "665mg",
            dose: "1 tablet",
            frequency: "1+0+1",
            route: "Oral",
            duration: "5 days",
            timingInstructions: "After meals",
            orderIndex: 0,
          },
        ],
        createdAt: "2026-10-18T10:00:00Z",
        updatedAt: "2026-10-18T10:00:00Z",
      };

      const pdfBuffer = await generatePrescriptionPdf({
        prescription: samplePrescription,
        patient: samplePatient,
        version: 1,
      });

      assert.ok(pdfBuffer instanceof Buffer);
      assert.ok(pdfBuffer.length > 1000);
      const pdfText = pdfBuffer.toString("latin1");
      assert.ok(pdfText.includes("Dr. Mohammad Rubaiath Tashfin"));
    });
  });
});
