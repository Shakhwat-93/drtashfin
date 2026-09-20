/**
 * Clinical Medical Event Entities.
 * Historical records remain strictly separate; a new visit or investigation never overwrites past records.
 */

export type VisitStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface Visit {
  id: string;
  patientId: string; // Links to Patient.patientId
  visitDate: string; // ISO format
  chiefComplaint: string;
  clinicalNotes?: string;
  diagnosis?: string;
  status: VisitStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvestigationStatus = "pending" | "sample-collected" | "completed" | "reviewed";

export interface Investigation {
  id: string;
  patientId: string;
  visitId?: string;
  testName: string;
  testCategory: "pathology" | "radiology" | "cardiology" | "general";
  dateOrdered: string;
  status: InvestigationStatus;
  reportNotes?: string;
  reportUrl?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  medicineName: string;
  dosage: string; // e.g., "500mg"
  frequency: string; // e.g., "1-0-1" or "Twice daily"
  duration: string; // e.g., "7 days"
  instructions?: string; // e.g., "After meals"
}

export interface Prescription {
  id: string;
  patientId: string;
  visitId?: string;
  items: PrescriptionItem[];
  dateIssued: string;
  notes?: string;
  createdAt: string;
}

export type FollowUpStatus = "scheduled" | "completed" | "missed" | "cancelled";

export interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  scheduledDate: string; // ISO date
  scheduledTime: string; // e.g., "01:30 PM"
  reason: string;
  room: string;
  status: FollowUpStatus;
  priority?: "normal" | "high";
  createdAt: string;
}

export type OperationStatus = "scheduled" | "pre-op" | "in-progress" | "completed" | "cancelled";

export interface Operation {
  id: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  procedureType: "minor" | "major";
  scheduledDate: string;
  scheduledTime: string;
  operatingTheater: string;
  status: OperationStatus;
  notes?: string;
  createdAt: string;
}

export interface ClinicalDocument {
  id: string;
  patientId: string;
  title: string;
  category: "lab-report" | "prescription" | "discharge-summary" | "consent" | "imaging";
  fileUrl: string;
  fileSize?: string;
  uploadedAt: string;
}

export interface ClinicalActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: "investigation" | "prescription" | "alert" | "visit" | "operation";
}

export interface DashboardMetrics {
  todayPatientsCount: number;
  todayFollowUpsCount: number;
  pendingInvestigationsCount: number;
  todayOperationsCount: number;
}
