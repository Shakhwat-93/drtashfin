import { Consultation } from "@/types/consultation";

/**
 * ==============================================================================
 * DEVELOPMENT-ONLY FICTIONAL CONSULTATION SEED DATA
 * Used strictly for offline development and testing of clinical workflows.
 * Contains no real personal health information (PHI).
 * ==============================================================================
 */

export const SEED_CONSULTATIONS: Consultation[] = [
  {
    id: "c82a1b02-5e4c-4158-b59a-112001e9c001",
    patientId: "PT-000001",
    consultationDate: "2026-09-10",
    chiefComplaint:
      "Follow-up for mild hypertension and occasional tension headaches over the past 2 weeks.",
    birthHistory: "Full-term normal vaginal delivery, no neonatal complications.",
    familyHistory: "Father had hypertension; mother diagnosed with Type 2 diabetes at age 58.",
    consanguinity: "no",
    drugHistory: "Amlodipine 5mg once daily in the morning.",
    others: "Non-smoker, occasional caffeine consumption.",
    clinicalExamination:
      "General: Alert, oriented, no pallor or edema.\nBP: 128/82 mmHg, Pulse: 74 bpm regular.\nCVS: S1, S2 present, no murmurs.\nResp: Clear vesicular breath sounds bilaterally.\nAbdomen: Soft, non-tender, no organomegaly.",
    investigationAdvised: "Serum Creatinine, Fasting Blood Sugar, Lipid Profile.",
    currentInvestigation: "Previous ECG (2026-08-15): Normal sinus rhythm.",
    provisionalDiagnosis: "Essential Hypertension (well controlled), Tension Headache.",
    differentialDiagnosis: "Cervicogenic headache, Migraine without aura.",
    plan: "Continue Amlodipine 5mg once daily. Encourage low sodium diet and regular brisk walking for 30 minutes daily.",
    advice: "Maintain daily BP log. Avoid excessive screen time without breaks. Stay well hydrated.",
    nextFollowUp: "2026-10-15",
    createdAt: "2026-09-10T10:30:00.000Z",
    updatedAt: "2026-09-10T10:30:00.000Z",
  },
  {
    id: "c82a1b02-5e4c-4158-b59a-112001e9c002",
    patientId: "PT-000001",
    consultationDate: "2026-08-15",
    chiefComplaint:
      "Initial consultation for elevated blood pressure detected during routine wellness check.",
    birthHistory: "Unremarkable, born at term.",
    familyHistory: "Paternal history of cardiovascular disease.",
    consanguinity: "no",
    drugHistory: "No current regular medications.",
    others: "Works in high-stress administrative role.",
    clinicalExamination:
      "BP: 142/90 mmHg, Pulse: 80 bpm.\nCardiovascular and respiratory examination unremarkable.\nBMI: 25.8 kg/m2.",
    investigationAdvised: "ECG, CBC, Serum Electrolytes, Urine R/E.",
    currentInvestigation: "None presented.",
    provisionalDiagnosis: "Stage 1 Hypertension.",
    differentialDiagnosis: "White coat hypertension, Secondary hypertension.",
    plan: "Initiate Amlodipine 5mg oral daily. Lifestyle modification and dietary adjustments.",
    advice: "Reduce dietary salt. Restrict processed food. Return for review in 4 weeks.",
    nextFollowUp: "2026-09-10",
    createdAt: "2026-08-15T09:15:00.000Z",
    updatedAt: "2026-08-15T09:15:00.000Z",
  },
  {
    id: "c82a1b02-5e4c-4158-b59a-112001e9c003",
    patientId: "PT-000002",
    consultationDate: "2026-09-02",
    chiefComplaint:
      "Persistent lower back stiffness on waking and bilateral knee discomfort when climbing stairs.",
    birthHistory: "Normal perinatal history.",
    familyHistory: "Osteoarthritis in maternal grandmother.",
    consanguinity: "no",
    drugHistory: "Paracetamol 500mg PRN for pain.",
    others: "Sedentary desk work, mild obesity.",
    clinicalExamination:
      "Spine: Range of motion mildly restricted in forward flexion. No focal neurological deficit.\nKnees: Bilateral mild crepitus, no effusion or erythema.",
    investigationAdvised: "X-Ray Lumbar Spine (AP/Lateral), X-Ray Both Knees (Standing AP).",
    currentInvestigation: "None.",
    provisionalDiagnosis: "Degenerative Osteoarthritis of Knees, Lumbar Spondylosis.",
    differentialDiagnosis: "Lumbar disc prolapse, Inflammatory arthritis.",
    plan: "Physiotherapy referral for quadriceps strengthening and lumbar core stabilization. Low-impact aerobic exercises.",
    advice: "Avoid prolonged sitting or heavy lifting. Apply warm compress for morning stiffness.",
    nextFollowUp: "2026-10-02",
    createdAt: "2026-09-02T11:45:00.000Z",
    updatedAt: "2026-09-02T11:45:00.000Z",
  },
];
