import { IFollowUpRepository } from "./follow-up-repository.interface";
import {
  FollowUp,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  CompleteFollowUpDTO,
  RescheduleFollowUpDTO,
  CancelFollowUpDTO,
  FollowUpFilterParams,
} from "@/types/follow-up";
import { MockStorage } from "../mock/mock-storage";
import { generateInternalUUID } from "../id-generator";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";
import { PatientNotFoundError, ValidationError, DataError } from "../errors";
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  cancelFollowUpSchema,
} from "@/schemas/follow-up";

export class MockFollowUpRepository implements IFollowUpRepository {
  private storageKey = "follow_ups_list";
  private patientRepo: IPatientRepository;

  constructor(patientRepo?: IPatientRepository) {
    this.patientRepo = patientRepo || new MockPatientRepository();
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const existing = MockStorage.get<FollowUp[]>(this.storageKey);
    if (!existing) {
      MockStorage.set(this.storageKey, []);
    }
  }

  private getAllInternal(): FollowUp[] {
    return MockStorage.get<FollowUp[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: FollowUp[]): void {
    MockStorage.set(this.storageKey, items);
  }

  public async getFollowUpsByPatient(patientId: string): Promise<FollowUp[]> {
    const patient = await this.patientRepo.getPatientByIdentifier(patientId);
    if (!patient) return [];

    const list = this.getAllInternal();
    return list
      .filter(
        (f) =>
          f.patientId === patient.id ||
          f.patientId === patient.patientId ||
          f.patientCode === patient.patientId
      )
      .sort(
        (a, b) =>
          new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );
  }

  public async getFollowUps(params: FollowUpFilterParams = {}): Promise<FollowUp[]> {
    let list = this.getAllInternal();
    const todayStr = new Date().toISOString().split("T")[0];

    if (params.patientId) {
      const patient = await this.patientRepo.getPatientByIdentifier(params.patientId);
      if (patient) {
        list = list.filter(
          (f) =>
            f.patientId === patient.id ||
            f.patientId === patient.patientId ||
            f.patientCode === patient.patientId
        );
      }
    }

    if (params.chamberId && params.chamberId !== "all") {
      list = list.filter((f) => f.chamberId === params.chamberId);
    }

    if (params.status) {
      if (params.status === "overdue") {
        list = list.filter(
          (f) => f.status === "scheduled" && f.scheduledDate < todayStr
        );
      } else if (params.status !== "all") {
        list = list.filter((f) => f.status === params.status);
      }
    }

    if (params.startDate) {
      list = list.filter((f) => f.scheduledDate >= params.startDate!);
    }

    if (params.endDate) {
      list = list.filter((f) => f.scheduledDate <= params.endDate!);
    }

    return list.sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }

  public async getFollowUpById(id: string): Promise<FollowUp | null> {
    const list = this.getAllInternal();
    return list.find((f) => f.id === id) || null;
  }

  public async createFollowUp(data: CreateFollowUpDTO): Promise<FollowUp> {
    const validation = createFollowUpSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid follow-up data provided.");
    }

    const validated = validation.data;
    const patient = await this.patientRepo.getPatientByIdentifier(validated.patientId);
    if (!patient) {
      throw new PatientNotFoundError(validated.patientId);
    }

    const now = new Date().toISOString();
    const newFollowUp: FollowUp = {
      id: generateInternalUUID(),
      patientId: patient.id,
      patientCode: patient.patientId,
      chamberId: validated.chamberId || patient.chamberId,
      consultationId:
        validated.consultationId ||
        validated.originatingConsultationId ||
        undefined,
      originatingConsultationId:
        validated.originatingConsultationId ||
        validated.consultationId ||
        undefined,
      scheduledDate: validated.scheduledDate,
      scheduledTime: validated.scheduledTime || "10:00 AM",
      reason: validated.reason || "Routine follow-up",
      notes: validated.notes || undefined,
      status: "scheduled",
      priority: validated.priority || "routine",
      createdAt: now,
      updatedAt: now,
    };

    const list = this.getAllInternal();
    list.unshift(newFollowUp);
    this.saveAllInternal(list);

    return newFollowUp;
  }

  public async updateFollowUp(
    id: string,
    data: UpdateFollowUpDTO
  ): Promise<FollowUp> {
    const validation = updateFollowUpSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid update data provided.");
    }

    const list = this.getAllInternal();
    const index = list.findIndex((f) => f.id === id);
    if (index === -1) {
      throw new DataError(`Follow-up with ID "${id}" was not found.`);
    }

    const existing = list[index]!;
    const now = new Date().toISOString();

    const updated: FollowUp = {
      ...existing,
      ...data,
      id: existing.id,
      patientId: existing.patientId,
      updatedAt: now,
    };

    list[index] = updated;
    this.saveAllInternal(list);
    return updated;
  }

  public async completeFollowUp(
    id: string,
    data: CompleteFollowUpDTO
  ): Promise<FollowUp> {
    const validation = completeFollowUpSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid completion data provided.");
    }

    return await this.updateFollowUp(id, {
      status: "completed",
      clinicalOutcome: validation.data.clinicalOutcome,
      outcomeNotes: validation.data.outcomeNotes || undefined,
      followUpConsultationId: validation.data.followUpConsultationId || undefined,
    });
  }

  public async rescheduleFollowUp(
    id: string,
    data: RescheduleFollowUpDTO
  ): Promise<FollowUp> {
    const validation = rescheduleFollowUpSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid reschedule data provided.");
    }

    return await this.updateFollowUp(id, {
      scheduledDate: validation.data.scheduledDate,
      scheduledTime: validation.data.scheduledTime || undefined,
      reason: validation.data.reason || undefined,
      status: "scheduled",
    });
  }

  public async cancelFollowUp(
    id: string,
    data: CancelFollowUpDTO
  ): Promise<FollowUp> {
    const validation = cancelFollowUpSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid cancellation data provided.");
    }

    return await this.updateFollowUp(id, {
      status: "cancelled",
      cancellationReason: validation.data.cancellationReason,
    });
  }

  public async deleteFollowUp(id: string): Promise<boolean> {
    const list = this.getAllInternal();
    const index = list.findIndex((f) => f.id === id);
    if (index === -1) return false;

    list.splice(index, 1);
    this.saveAllInternal(list);
    return true;
  }

  public async getUpcomingFollowUps(
    limitOrFilterId?: number | string,
    chamberId?: string
  ): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];
    let list = this.getAllInternal().filter(
      (f) => f.status === "scheduled" && f.scheduledDate >= todayStr
    );

    const filterId = typeof limitOrFilterId === "string" ? limitOrFilterId : chamberId;
    const limit = typeof limitOrFilterId === "number" ? limitOrFilterId : 10;

    if (filterId && filterId !== "all") {
      list = list.filter(
        (f) =>
          f.chamberId === filterId ||
          f.patientId === filterId ||
          f.patientCode === filterId
      );
    }

    return list
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, limit);
  }

  public async getOverdueFollowUps(filterId?: string): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];
    let list = this.getAllInternal().filter(
      (f) => f.status === "scheduled" && f.scheduledDate < todayStr
    );

    if (filterId && filterId !== "all") {
      list = list.filter(
        (f) =>
          f.chamberId === filterId ||
          f.patientId === filterId ||
          f.patientCode === filterId
      );
    }

    return list.sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  public async getCompletedFollowUps(filterId?: string): Promise<FollowUp[]> {
    let list = this.getAllInternal().filter((f) => f.status === "completed");
    if (filterId && filterId !== "all") {
      list = list.filter(
        (f) =>
          f.chamberId === filterId ||
          f.patientId === filterId ||
          f.patientCode === filterId
      );
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}
