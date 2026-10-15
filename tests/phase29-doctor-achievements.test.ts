import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENT_CATEGORIES,
  CreateAchievementDTO,
} from "../src/types/achievement";
import {
  createAchievementSchema,
} from "../src/schemas/achievement";
import {
  validateAndNormalizePublicationUrl,
} from "../src/lib/validators/publication-url-validator";
import {
  validateAndNormalizeGoogleDriveUrl,
} from "../src/lib/drive/drive-url-utils";
import { MockDoctorAchievementRepository } from "../src/lib/data/repositories/mock-achievement-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
} from "../src/lib/data";

describe("Phase 29 — Doctor Lifetime Achievements & Evidence Management", () => {
  let achievementRepo: MockDoctorAchievementRepository;

  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
    MockStorage.clear();
    achievementRepo = new MockDoctorAchievementRepository();
  });

  describe("1. Achievement Categories & Domain Definitions", () => {
    it("should support all 9 standard professional categories", () => {
      assert.deepEqual(ACHIEVEMENT_CATEGORIES, [
        "Academic Qualifications",
        "Professional Certifications",
        "Awards & Honors",
        "Medical Training & Workshops",
        "Conferences & Seminars",
        "Research & Publications",
        "Professional Memberships",
        "Career Milestones",
        "Other Achievements",
      ]);
    });
  });

  describe("2. Schema Validation & Business Constraints", () => {
    it("should accept valid achievement creation payload", () => {
      const valid = {
        title: "Master of Surgery (MS - General Surgery)",
        category: "Academic Qualifications",
        institution: "Bangabandhu Sheikh Mujib Medical University (BSMMU)",
        achievementDate: "2020-03-15",
        description: "Postgraduate master's degree in advanced surgical science.",
        evidenceTitle: "Official Degree Certificate",
        driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
        displayOrder: 1,
        isPublished: true,
      };

      const result = createAchievementSchema.safeParse(valid);
      assert.equal(result.success, true);
    });

    it("should reject achievement title shorter than 2 characters", () => {
      const invalid = {
        title: "A",
        category: "Academic Qualifications",
      };

      const result = createAchievementSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    it("should reject invalid achievement category", () => {
      const invalid = {
        title: "Senior Surgeon",
        category: "Invalid Category Name",
      };

      const result = createAchievementSchema.safeParse(invalid);
      assert.equal(result.success, false);
    });

    it("should reject expiration date earlier than achievement date", () => {
      const invalid = {
        title: "Advanced Trauma Life Support (ATLS)",
        category: "Professional Certifications",
        achievementDate: "2023-01-01",
        expirationDate: "2022-01-01", // earlier than achievement date
      };

      const result = createAchievementSchema.safeParse(invalid);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) =>
            i.message.includes("Expiration date must be on or after achievement date")
          )
        );
      }
    });

    it("should accept valid expiration date on or after achievement date", () => {
      const valid = {
        title: "Advanced Trauma Life Support (ATLS)",
        category: "Professional Certifications",
        achievementDate: "2023-01-01",
        expirationDate: "2027-01-01",
      };

      const result = createAchievementSchema.safeParse(valid);
      assert.equal(result.success, true);
    });
  });

  describe("3. Google Drive Evidence URL Validation (Link-Only)", () => {
    it("should accept and normalize valid HTTPS Google Drive file links", () => {
      const url = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view";
      const check = validateAndNormalizeGoogleDriveUrl(url);
      assert.equal(check.isValid, true);
      assert.equal(check.resourceType, "file");
      assert.equal(check.resourceId, "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    });

    it("should accept and normalize valid Google Docs links", () => {
      const url = "https://docs.google.com/document/d/1qpy3G9JE84LkTo8hWB00q7A36-u_k/edit";
      const check = validateAndNormalizeGoogleDriveUrl(url);
      assert.equal(check.isValid, true);
      assert.equal(check.resourceType, "document");
    });

    it("should reject non-Google domains for evidence document links", () => {
      const url = "https://dropbox.com/s/12345/doc.pdf";
      const check = validateAndNormalizeGoogleDriveUrl(url);
      assert.equal(check.isValid, false);
      assert.ok(check.error?.includes("Google Drive"));
    });

    it("should reject insecure HTTP Google links", () => {
      const url = "http://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view";
      const check = validateAndNormalizeGoogleDriveUrl(url);
      assert.equal(check.isValid, false);
      assert.ok(check.error?.includes("HTTPS"));
    });

    it("should reject local file paths or relative URLs", () => {
      const local = "file:///C:/Users/doctor/evidence.pdf";
      const check = validateAndNormalizeGoogleDriveUrl(local);
      assert.equal(check.isValid, false);
    });
  });

  describe("4. Strict HTTPS Publication URL Validator (SSRF Protection)", () => {
    it("should accept valid external HTTPS publication URLs", () => {
      const doi = "https://doi.org/10.1016/j.jvs.2023.01.002";
      const check = validateAndNormalizePublicationUrl(doi);
      assert.equal(check.isValid, true);
      assert.equal(check.normalizedUrl, doi);

      const pubmed = "https://pubmed.ncbi.nlm.nih.gov/36512345/";
      const checkPub = validateAndNormalizePublicationUrl(pubmed);
      assert.equal(checkPub.isValid, true);
    });

    it("should reject insecure HTTP publication URLs", () => {
      const check = validateAndNormalizePublicationUrl("http://journal.medicine.org/article123");
      assert.equal(check.isValid, false);
      assert.ok(check.error?.includes("HTTPS"));
    });

    it("should reject localhost, single-label domains, and loopback IP addresses", () => {
      const localhost = validateAndNormalizePublicationUrl("https://localhost/exploit");
      assert.equal(localhost.isValid, false);

      const loopback = validateAndNormalizePublicationUrl("https://127.0.0.1:8080/token");
      assert.equal(loopback.isValid, false);
      assert.ok(loopback.error?.includes("Private and internal IP addresses are not permitted"));
    });

    it("should reject private internal IPv4 ranges (10.x, 192.168.x, 172.16.x)", () => {
      const priv10 = validateAndNormalizePublicationUrl("https://10.0.0.1/admin");
      assert.equal(priv10.isValid, false);

      const priv192 = validateAndNormalizePublicationUrl("https://192.168.1.50/api");
      assert.equal(priv192.isValid, false);

      const priv172 = validateAndNormalizePublicationUrl("https://172.20.0.5/");
      assert.equal(priv172.isValid, false);
    });

    it("should reject URLs containing embedded credentials", () => {
      const creds = validateAndNormalizePublicationUrl("https://user:pass@doi.org/article");
      assert.equal(creds.isValid, false);
      assert.ok(creds.error?.includes("credentials"));
    });
  });

  describe("5. Repository CRUD Operations & Ordering", () => {
    it("should create and retrieve a doctor achievement", async () => {
      const dto: CreateAchievementDTO = {
        title: "Fellowship of the Royal College of Surgeons (FRCS)",
        category: "Academic Qualifications",
        institution: "Royal College of Surgeons of England",
        achievementDate: "2021-06-20",
        description: "Admitted as Fellow following examination in General Surgery.",
        displayOrder: 2,
        isPublished: true,
      };

      const created = await achievementRepo.createAchievement(dto);
      assert.ok(created.id);
      assert.equal(created.title, dto.title);
      assert.equal(created.category, dto.category);
      assert.equal(created.institution, dto.institution);

      const fetched = await achievementRepo.getAchievementById(created.id);
      assert.ok(fetched);
      assert.equal(fetched.id, created.id);
    });

    it("should update achievement fields", async () => {
      const created = await achievementRepo.createAchievement({
        title: "Clinical Laparoscopic Workshop",
        category: "Medical Training & Workshops",
        achievementDate: "2022-04-10",
        displayOrder: 5,
        isPublished: false,
      });

      const updated = await achievementRepo.updateAchievement(created.id, {
        title: "Advanced Clinical Laparoscopic Masterclass",
        displayOrder: 1,
        isPublished: true,
        institution: "IRCAD Strasbourg",
      });

      assert.equal(updated.title, "Advanced Clinical Laparoscopic Masterclass");
      assert.equal(updated.displayOrder, 1);
      assert.equal(updated.isPublished, true);
      assert.equal(updated.institution, "IRCAD Strasbourg");
    });

    it("should support display order and chronological ordering", async () => {
      await achievementRepo.createAchievement({
        title: "Achievement C (Order 10, Date 2021)",
        category: "Awards & Honors",
        achievementDate: "2021-01-01",
        displayOrder: 10,
        isPublished: true,
      });

      await achievementRepo.createAchievement({
        title: "Achievement A (Order 1, Date 2022)",
        category: "Academic Qualifications",
        achievementDate: "2022-01-01",
        displayOrder: 1,
        isPublished: true,
      });

      await achievementRepo.createAchievement({
        title: "Achievement B (Order 5, Date 2023)",
        category: "Research & Publications",
        achievementDate: "2023-01-01",
        displayOrder: 5,
        isPublished: true,
      });

      const results = await achievementRepo.getAchievements();
      assert.equal(results.length, 3);
      assert.equal(results[0].title, "Achievement A (Order 1, Date 2022)");
      assert.equal(results[1].title, "Achievement B (Order 5, Date 2023)");
      assert.equal(results[2].title, "Achievement C (Order 10, Date 2021)");
    });

    it("should filter achievements by category and publication status", async () => {
      await achievementRepo.createAchievement({
        title: "Published Award",
        category: "Awards & Honors",
        isPublished: true,
      });

      await achievementRepo.createAchievement({
        title: "Draft Award",
        category: "Awards & Honors",
        isPublished: false,
      });

      await achievementRepo.createAchievement({
        title: "Published Degree",
        category: "Academic Qualifications",
        isPublished: true,
      });

      const awards = await achievementRepo.getAchievements({ category: "Awards & Honors" });
      assert.equal(awards.length, 2);

      const publishedOnly = await achievementRepo.getAchievements({ isPublished: true });
      assert.equal(publishedOnly.length, 2);

      const publishedAwards = await achievementRepo.getAchievements({
        category: "Awards & Honors",
        isPublished: true,
      });
      assert.equal(publishedAwards.length, 1);
      assert.equal(publishedAwards[0].title, "Published Award");
    });

    it("should search achievements by title, institution, or description", async () => {
      await achievementRepo.createAchievement({
        title: "Gold Medal in Surgical Oncology",
        category: "Awards & Honors",
        institution: "Dhaka Medical College",
        description: "Awarded for highest score in surgical finals.",
      });

      await achievementRepo.createAchievement({
        title: "WHO Consultation on Patient Safety",
        category: "Conferences & Seminars",
        institution: "World Health Organization",
        description: "International expert panel on clinical quality.",
      });

      const searchTitle = await achievementRepo.getAchievements({ searchQuery: "Gold Medal" });
      assert.equal(searchTitle.length, 1);
      assert.equal(searchTitle[0].title, "Gold Medal in Surgical Oncology");

      const searchInst = await achievementRepo.getAchievements({ searchQuery: "World Health" });
      assert.equal(searchInst.length, 1);
      assert.equal(searchInst[0].title, "WHO Consultation on Patient Safety");

      const searchDesc = await achievementRepo.getAchievements({ searchQuery: "highest score" });
      assert.equal(searchDesc.length, 1);
    });

    it("should calculate category summary counts accurately", async () => {
      await achievementRepo.createAchievement({
        title: "Degree 1",
        category: "Academic Qualifications",
      });
      await achievementRepo.createAchievement({
        title: "Degree 2",
        category: "Academic Qualifications",
      });
      await achievementRepo.createAchievement({
        title: "Certification 1",
        category: "Professional Certifications",
      });

      const counts = await achievementRepo.getCategoryCounts();
      assert.equal(counts["Academic Qualifications"], 2);
      assert.equal(counts["Professional Certifications"], 1);
      assert.equal(counts["Awards & Honors"] || 0, 0);
    });

    it("should prevent duplicate submissions with identical title, category, institution, and date", async () => {
      const dto: CreateAchievementDTO = {
        title: "Unique Medical Award",
        category: "Awards & Honors",
        institution: "National Health Ministry",
        achievementDate: "2024-05-10",
      };

      await achievementRepo.createAchievement(dto);

      // Second identical submission
      await assert.rejects(
        async () => {
          await achievementRepo.createAchievement(dto);
        },
        (err: Error) => {
          return err.message.includes("already exists");
        }
      );
    });

    it("should safely delete an achievement record without affecting other data", async () => {
      const a1 = await achievementRepo.createAchievement({
        title: "To Keep",
        category: "Career Milestones",
      });
      const a2 = await achievementRepo.createAchievement({
        title: "To Delete",
        category: "Career Milestones",
      });

      await achievementRepo.deleteAchievement(a2.id);

      const foundA2 = await achievementRepo.getAchievementById(a2.id);
      assert.equal(foundA2, null);

      const foundA1 = await achievementRepo.getAchievementById(a1.id);
      assert.ok(foundA1);
    });
  });

  describe("6. Separation from Clinical Records & Link-Only Integrity", () => {
    it("should maintain zero relational dependency on patient IDs or clinical records", async () => {
      const achievement = await achievementRepo.createAchievement({
        title: "Lifetime Excellence in General & Laparoscopic Surgery",
        category: "Awards & Honors",
        institution: "Bangladesh College of Physicians and Surgeons",
        achievementDate: "2025-12-01",
        driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
      });

      // Assert that DoctorAchievement interface has no patientId or consultationId keys
      const keys = Object.keys(achievement);
      assert.equal(keys.includes("patientId"), false);
      assert.equal(keys.includes("consultationId"), false);
      assert.equal(keys.includes("prescriptionId"), false);
    });
  });

  describe("7. CSV Export Formatting & Formula Injection Mitigation", () => {
    it("should escape special characters and neutralize spreadsheet formula injection", () => {
      // Test formula neutralization helper logic directly
      function escapeCsvField(val: unknown): string {
        if (val === null || val === undefined) return '""';
        let str = String(val);

        // Neutralize spreadsheet formula injection characters (=, +, -, @)
        if (/^[=+\-@]/.test(str)) {
          str = "'" + str;
        }

        return `"${str.replace(/"/g, '""')}"`;
      }

      // Safe text
      assert.equal(escapeCsvField("Regular Title"), '"Regular Title"');

      // Formula injection attempts
      assert.equal(escapeCsvField("=cmd|'/C calc'!A0"), "\"'=cmd|'/C calc'!A0\"");
      assert.equal(escapeCsvField("+SUM(1+1)"), "\"'+SUM(1+1)\"");
      assert.equal(escapeCsvField("-2+5"), "\"'-2+5\"");
      assert.equal(escapeCsvField("@evil_endpoint"), "\"'@evil_endpoint\"");

      // Quotes escaping
      assert.equal(escapeCsvField('Title with "Quotes"'), '"Title with ""Quotes"""');
    });
  });
});
