import { ClinicalOutcome } from "./consultation";
export type { ClinicalOutcome };

export type FollowUpStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type FollowUpPriority =
  | "normal"
  | "high"
  | "urgent"
  | "routine"
  | "review";

export interface FollowUp {
  id: string; // Unique UUID
  patientId: string; // Internal UUID or patientCode
  patientCode?: string; // Human-readable e.g. DH-000001
  chamberId?: string; // Assigned chamber UUID
  consultationId?: string; // Originating consultation UUID
  originatingConsultationId?: string; // Alias for consultationId
  followUpConsultationId?: string; // Subsequent consultation UUID when completed
  scheduledDate: string; // ISO date string (YYYY-MM-DD)
  scheduledTime?: string; // e.g. "10:30 AM"
  reason: string; // Specific clinical follow-up reason
  notes?: string; // Detailed instructions or clinical notes
  status: FollowUpStatus;
  clinicalOutcome?: ClinicalOutcome; // improved, unchanged, worsened
  outcomeNotes?: string;
  cancellationReason?: string;
  priority?: FollowUpPriority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpDTO {
  patientId: string;
  patientCode?: string;
  chamberId?: string;
  consultationId?: string;
  originatingConsultationId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  reason?: string;
  priority?: FollowUpPriority;
  notes?: string;
}

export interface UpdateFollowUpDTO {
  scheduledDate?: string;
  scheduledTime?: string;
  reason?: string;
  notes?: string;
  status?: FollowUpStatus;
  clinicalOutcome?: ClinicalOutcome;
  outcomeNotes?: string;
  cancellationReason?: string;
  priority?: FollowUpPriority;
  followUpConsultationId?: string;
}

export interface CompleteFollowUpDTO {
  clinicalOutcome: ClinicalOutcome;
  outcomeNotes?: string;
  followUpConsultationId?: string;
}

export interface RescheduleFollowUpDTO {
  scheduledDate: string;
  scheduledTime?: string;
  reason?: string;
}

export interface CancelFollowUpDTO {
  cancellationReason: string;
}

export interface FollowUpFilterParams {
  patientId?: string;
  chamberId?: string;
  status?: FollowUpStatus | "all" | "overdue";
  startDate?: string;
  endDate?: string;
}
