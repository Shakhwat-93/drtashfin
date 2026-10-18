import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { calculateAgeFromDob, getClinicToday } from "../src/lib/date-utils";

describe("Real-Time Date of Birth to Age Auto-Calculation", () => {
  it("calculates completed years correctly when birthday has occurred this year", () => {
    // Born 1990-05-10, base date 2026-10-18 (birthday was in May)
    const age = calculateAgeFromDob("1990-05-10", "2026-10-18");
    assert.strictEqual(age, 36);
  });

  it("calculates completed years correctly when birthday has NOT occurred yet this year", () => {
    // Born 1990-12-25, base date 2026-10-18 (birthday is in December)
    const age = calculateAgeFromDob("1990-12-25", "2026-10-18");
    assert.strictEqual(age, 35);
  });

  it("calculates completed years on the exact day of the birthday", () => {
    // Born 1990-10-18, base date 2026-10-18 (birthday is today!)
    const age = calculateAgeFromDob("1990-10-18", "2026-10-18");
    assert.strictEqual(age, 36);
  });

  it("calculates age 0 for infants born on the same date", () => {
    const age = calculateAgeFromDob("2026-10-18", "2026-10-18");
    assert.strictEqual(age, 0);
  });

  it("calculates age 0 for infants born a few months ago in the current year", () => {
    const age = calculateAgeFromDob("2026-04-05", "2026-10-18");
    assert.strictEqual(age, 0);
  });

  it("handles leap year birthday (Feb 29) on a non-leap year", () => {
    // Born 2000-02-29 (leap year)
    // In 2001 (non-leap year):
    // On Feb 28, 2001, completed 0 years
    assert.strictEqual(calculateAgeFromDob("2000-02-29", "2001-02-28"), 0);
    // On March 1, 2001, completed 1 year
    assert.strictEqual(calculateAgeFromDob("2000-02-29", "2001-03-01"), 1);
  });

  it("handles leap year birthday (Feb 29) on another leap year", () => {
    // Born 2000-02-29 (leap year)
    // On Feb 28, 2004, completed 3 years
    assert.strictEqual(calculateAgeFromDob("2000-02-29", "2004-02-28"), 3);
    // On Feb 29, 2004, completed 4 years
    assert.strictEqual(calculateAgeFromDob("2000-02-29", "2004-02-29"), 4);
  });

  it("rejects future dates by returning null", () => {
    const age = calculateAgeFromDob("2026-10-19", "2026-10-18");
    assert.strictEqual(age, null);

    const futureYear = calculateAgeFromDob("2099-01-01", "2026-10-18");
    assert.strictEqual(futureYear, null);
  });

  it("rejects invalid calendar dates (e.g. Feb 30 or April 31)", () => {
    assert.strictEqual(calculateAgeFromDob("2020-02-30", "2026-10-18"), null);
    assert.strictEqual(calculateAgeFromDob("2021-02-29", "2026-10-18"), null); // 2021 is not leap year
    assert.strictEqual(calculateAgeFromDob("2020-04-31", "2026-10-18"), null);
  });

  it("rejects malformed and empty dates by returning null", () => {
    assert.strictEqual(calculateAgeFromDob(""), null);
    assert.strictEqual(calculateAgeFromDob("   "), null);
    assert.strictEqual(calculateAgeFromDob(null), null);
    assert.strictEqual(calculateAgeFromDob(undefined), null);
    assert.strictEqual(calculateAgeFromDob("invalid-date"), null);
    assert.strictEqual(calculateAgeFromDob("1990/05/10"), null);
  });

  it("uses Asia/Dhaka clinic today by default when base date is omitted", () => {
    const todayStr = getClinicToday();
    const age = calculateAgeFromDob(todayStr);
    assert.strictEqual(age, 0);
  });
});

describe("Hotfix: Consultation Schema Column Mismatch", () => {
  it("ensures consultation repository uses snake_case drug_history in insert payload", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-consultation-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    // Must NOT contain camelCase 'drugHistory:' in payload mapping
    assert.ok(
      !content.includes("drugHistory: validated.drugHistory"),
      "Found invalid camelCase 'drugHistory:' in consultation payload!"
    );

    // Must contain snake_case 'drug_history:'
    assert.ok(
      content.includes("drug_history: validated.drugHistory"),
      "Missing valid snake_case 'drug_history:' in consultation payload!"
    );
  });
});

describe("Hotfix: Patient Identifier Resolution (DH-000001)", () => {
  it("diagnostic report repository uses getPatientByIdentifier to resolve non-UUID codes", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-diagnostic-report-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    assert.ok(
      content.includes("this.patientRepo.getPatientByIdentifier(patientIdentifier)"),
      "Diagnostic report repository does not use getPatientByIdentifier in resolvePatientDbId!"
    );
  });

  it("procedure repository uses getPatientByIdentifier to resolve non-UUID codes", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-procedure-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    assert.ok(
      content.includes("this.patientRepo.getPatientByIdentifier(patientIdentifier)"),
      "Procedure repository does not use getPatientByIdentifier in resolvePatientDbId!"
    );
  });

  it("discharge repository uses getPatientByIdentifier to resolve non-UUID codes", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-discharge-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    assert.ok(
      content.includes("this.patientRepo.getPatientByIdentifier(patientIdentifier)"),
      "Discharge repository does not use getPatientByIdentifier in resolvePatientDbId!"
    );
  });
});

describe("Hotfix: Clinical Dashboard Chamber Scoping Queries", () => {
  it("clinical repository joins patients table for diagnostic_reports and patient_procedures chamber filtering", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-clinical-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    assert.ok(
      content.includes("patients!inner(chamber_id)"),
      "Clinical repository must use patients!inner(chamber_id) for diagnostic_reports & patient_procedures!"
    );
    assert.ok(
      content.includes("getClinicToday()"),
      "Clinical repository should use getClinicToday() for Dhaka clinic timezone!"
    );
  });

  it("report repository joins patients table for diagnostic_reports, patient_procedures, and patient_discharges chamber filtering", () => {
    const repoFilePath = path.join(
      process.cwd(),
      "src/lib/data/repositories/supabase-report-repository.ts"
    );
    const content = fs.readFileSync(repoFilePath, "utf8");

    assert.ok(
      content.includes("patients!inner(chamber_id)"),
      "Report repository must use patients!inner(chamber_id) for diagnostic_reports, patient_procedures & discharges!"
    );
  });
});

describe("Hotfix: Navigation Routes Resolution (No 404s)", () => {
  const routes = [
    "consultations",
    "investigations",
    "prescriptions",
    "documents",
    "operations",
    "audit-logs",
  ];

  routes.forEach((route) => {
    it(`verifies page exists for /${route}`, () => {
      const pagePath = path.join(process.cwd(), `src/app/${route}/page.tsx`);
      assert.ok(
        fs.existsSync(pagePath),
        `Route page missing for /${route} at ${pagePath}`
      );
      const content = fs.readFileSync(pagePath, "utf8");
      assert.ok(
        content.includes("export default"),
        `Route page for /${route} must have a default export`
      );
    });
  });
});
