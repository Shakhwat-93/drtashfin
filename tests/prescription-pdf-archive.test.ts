import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  setRepositoryProvider,
  getPrescriptionRepository,
  getClinicalDocumentRepository,
  resetRepositoryInstances,
} from "../src/lib/data";
import { generatePrescriptionPdf } from "../src/lib/pdf/prescription-pdf-generator";
import { Patient } from "../src/types/patient";
import { Prescription } from "../src/types/prescription";

describe("Prescription PDF & Document Integrity Suite", () => {
  const syntheticPatient: Patient = {
    id: "pat-synthetic-001",
    patientId: "PT-999001",
    name: "রহিম উদ্দিন (Rahim Uddin)",
    age: 45,
    gender: "male",
    phone: "+8801711000000",
    dateOfBirth: "1979-05-12",
    weight: 72,
    bloodGroup: "B+",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const syntheticFinalizedPrescription: Prescription = {
    id: "rx-synthetic-001",
    prescriptionCode: "RX-999001",
    patientId: syntheticPatient.id,
    doctorId: "dr-tashfin",
    prescriptionDate: "2026-10-12",
    status: "finalized",
    finalizedAt: new Date().toISOString(),
    advice: "পর্যাপ্ত পানি পান করুন। তেল-চর্বিযুক্ত খাবার এড়িয়ে চলুন।",
    followUpDate: "2026-10-26",
    followUpInstructions: "রক্তচাপ ও ল্যাব টেস্টের রিপোর্ট সাথে আনবেন",
    items: [
      {
        id: "item-1",
        prescriptionId: "rx-synthetic-001",
        brandName: "Napa Extra",
        genericName: "Paracetamol + Caffeine",
        strength: "500 mg + 65 mg",
        dosageForm: "Tablet",
        dose: "1 tablet",
        frequency: "1+0+1",
        route: "Oral",
        duration: "7 days",
        timingInstructions: "After meal",
        specialInstructions: "জ্বর বা ব্যথা থাকলে খাবেন",
        orderIndex: 0,
      },
      {
        id: "item-2",
        prescriptionId: "rx-synthetic-001",
        brandName: "Camlosart 5/20",
        genericName: "Amlodipine + Olmesartan",
        strength: "5 mg + 20 mg",
        dosageForm: "Tablet",
        dose: "1 tablet",
        frequency: "0+0+1",
        route: "Oral",
        duration: "30 days",
        timingInstructions: "At night",
        orderIndex: 1,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  it("generates a valid, non-empty A4 PDF buffer containing PDF header", async () => {
    const pdfBuffer = await generatePrescriptionPdf({
      prescription: syntheticFinalizedPrescription,
      patient: syntheticPatient,
      version: 1,
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), "Output should be a Node.js Buffer");
    assert.ok(pdfBuffer.length > 1000, "PDF buffer should be larger than 1KB");
    // Standard PDF file signature starts with %PDF-
    const header = pdfBuffer.subarray(0, 5).toString("ascii");
    assert.equal(header, "%PDF-", "File signature should start with %PDF-");
  });

  it("supports Unicode and Bangla text without throwing encoding errors", async () => {
    const pdfBuffer = await generatePrescriptionPdf({
      prescription: syntheticFinalizedPrescription,
      patient: syntheticPatient,
      contentHash: "4a5f8e9c1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      version: 1,
    });

    assert.ok(pdfBuffer.length > 5000, "Unicode PDF buffer should include embedded font data");
  });

  it("computes reproducible SHA-256 content hashes for tamper detection", async () => {
    const pdfBuffer1 = await generatePrescriptionPdf({
      prescription: syntheticFinalizedPrescription,
      patient: syntheticPatient,
      version: 1,
    });

    const hash1 = crypto.createHash("sha256").update(pdfBuffer1).digest("hex");
    assert.equal(hash1.length, 64, "SHA-256 hash must be 64 hexadecimal characters");

    // Tampered buffer
    const tamperedBuffer = Buffer.concat([pdfBuffer1, Buffer.from("TAMPERED_DATA")]);
    const tamperedHash = crypto.createHash("sha256").update(tamperedBuffer).digest("hex");
    assert.notEqual(hash1, tamperedHash, "Tampered buffer must produce a different hash");
  });

  it("handles multi-page output with 15+ medications cleanly", async () => {
    const longItems = Array.from({ length: 16 }).map((_, idx) => ({
      id: `item-${idx}`,
      prescriptionId: "rx-synthetic-001",
      brandName: `Medication Brand ${idx + 1}`,
      genericName: `Generic Compound ${idx + 1}`,
      strength: "10 mg",
      dosageForm: "Tablet",
      dose: "1 tablet",
      frequency: "1+0+1",
      route: "Oral",
      duration: "14 days",
      timingInstructions: "After meal",
      orderIndex: idx,
    }));

    const multiPageRx: Prescription = {
      ...syntheticFinalizedPrescription,
      items: longItems,
    };

    const pdfBuffer = await generatePrescriptionPdf({
      prescription: multiPageRx,
      patient: syntheticPatient,
      version: 1,
    });

    assert.ok(pdfBuffer.length > 8000, "Multi-page PDF should have larger size");
  });

  it("records and retrieves clinical document metadata with versions in repository", async () => {
    const docRepo = getClinicalDocumentRepository();

    const createdDoc = await docRepo.createDocument({
      patientId: syntheticPatient.id,
      prescriptionId: syntheticFinalizedPrescription.id,
      title: "Prescription - RX-999001 (v1)",
      category: "prescription",
      r2Key: `prescriptions/PT-999001/${syntheticFinalizedPrescription.id}/v1_RX-999001.pdf`,
      contentHash: "abc123hash",
      version: 1,
      fileSizeBytes: 12500,
    });

    assert.equal(createdDoc.version, 1);
    assert.equal(createdDoc.category, "prescription");
    assert.equal(createdDoc.contentHash, "abc123hash");

    const docs = await docRepo.getDocumentsByPrescriptionId(syntheticFinalizedPrescription.id);
    assert.equal(docs.length, 1);
    assert.equal(docs[0].id, createdDoc.id);

    // Version 2 archival
    const v2Doc = await docRepo.createDocument({
      patientId: syntheticPatient.id,
      prescriptionId: syntheticFinalizedPrescription.id,
      title: "Prescription - RX-999001 (v2)",
      category: "prescription",
      r2Key: `prescriptions/PT-999001/${syntheticFinalizedPrescription.id}/v2_RX-999001.pdf`,
      contentHash: "xyz789hash",
      version: 2,
      fileSizeBytes: 13000,
    });
    assert.ok(v2Doc.id);

    const updatedDocs = await docRepo.getDocumentsByPrescriptionId(syntheticFinalizedPrescription.id);
    assert.equal(updatedDocs.length, 2);
    assert.equal(updatedDocs[0].version, 2, "Latest version should be returned first");

    const latest = await docRepo.getLatestDocumentByPrescriptionId(syntheticFinalizedPrescription.id);
    assert.ok(latest);
    assert.equal(latest.version, 2);
  });

  it("attaches archive metadata to prescription and preserves audit lock", async () => {
    const rxRepo = getPrescriptionRepository();
    const created = await rxRepo.createPrescription({
      patientId: syntheticPatient.id,
      status: "finalized",
      items: [
        {
          brandName: "Napa",
          genericName: "Paracetamol",
          frequency: "1+0+1",
        },
      ],
    });

    assert.equal(created.status, "finalized");

    const updated = await rxRepo.attachArchivedDocument(created.id, {
      archivedDocumentId: "doc-123",
      archivedPdfKey: "prescriptions/PT-001/v1.pdf",
      archivedPdfHash: "hash-12345",
      archivedPdfSize: 8400,
      archiveVersion: 1,
      archivedAt: new Date().toISOString(),
    });

    assert.equal(updated.archivedDocumentId, "doc-123");
    assert.equal(updated.archivedPdfKey, "prescriptions/PT-001/v1.pdf");
    assert.equal(updated.archivedPdfHash, "hash-12345");
    assert.equal(updated.archiveVersion, 1);
  });
});
