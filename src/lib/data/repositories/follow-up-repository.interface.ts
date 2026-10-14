import {
  FollowUp,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  CompleteFollowUpDTO,
  RescheduleFollowUpDTO,
  CancelFollowUpDTO,
  FollowUpFilterParams,
} from "@/types/follow-up";

export interface IFollowUpRepository {
  getFollowUpsByPatient(patientId: string): Promise<FollowUp[]>;
  getFollowUps(params?: FollowUpFilterParams): Promise<FollowUp[]>;
  getFollowUpById(id: string): Promise<FollowUp | null>;
  createFollowUp(data: CreateFollowUpDTO): Promise<FollowUp>;
  updateFollowUp(id: string, data: UpdateFollowUpDTO): Promise<FollowUp>;
  completeFollowUp(id: string, data: CompleteFollowUpDTO): Promise<FollowUp>;
  rescheduleFollowUp(id: string, data: RescheduleFollowUpDTO): Promise<FollowUp>;
  cancelFollowUp(id: string, data: CancelFollowUpDTO): Promise<FollowUp>;
  deleteFollowUp(id: string): Promise<boolean>;
  getUpcomingFollowUps(limitOrFilterId?: number | string, chamberId?: string): Promise<FollowUp[]>;
  getOverdueFollowUps(filterId?: string): Promise<FollowUp[]>;
  getCompletedFollowUps(filterId?: string): Promise<FollowUp[]>;
}
