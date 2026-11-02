import { IPrescriptionRepository } from "./prescription-repository.interface";
import {
  Prescription,
  PrescriptionItem,
  CreatePrescriptionDTO,
  UpdatePrescriptionDTO,
} from "@/types/prescription";
import { DataError, ValidationError } from "../errors";
import { MockStorage } from "../mock/mock-storage";

export class MockPrescriptionRepository implements IPrescriptionRepository {
  private storageKey = "prescriptions_list";
  private codeCounter = 1;

  constructor(initialData: Prescription[] = []) {
    const existing = MockStorage.get<Prescription[]>(this.storageKey);
    if (!existing || existing.length === 0) {
      MockStorage.set(this.storageKey, [...initialData]);
      this.codeCounter = initialData.length + 1;
    } else {
      if (initialData.length > 0) {
        const merged = [...existing];
        for (const item of initialData) {
          if (!merged.some((m) => m.id === item.id)) {
            merged.push(item);
          }
        }
        MockStorage.set(this.storageKey, merged);
      }
      this.codeCounter = (MockStorage.get<Prescription[]>(this.storageKey) || []).length + 1;
    }
  }

  private getAllInternal(): Prescription[] {
    return MockStorage.get<Prescription[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: Prescription[]): void {
    MockStorage.set(this.storageKey, items);
  }

  private generateCode(): string {
    const code = `RX-${String(this.codeCounter).padStart(6, "0")}`;
    this.codeCounter++;
    return code;
  }

  public async getPrescriptionsByPatientId(
    patientId: string
  ): Promise<Prescription[]> {
    return this.getAllInternal()
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getPrescriptionByConsultationId(
    consultationId: string
  ): Promise<Prescription | null> {
    const found = this.getAllInternal()
      .filter((p) => p.consultationId === consultationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async getPrescriptionById(id: string): Promise<Prescription | null> {
    const found = this.getAllInternal().find(
      (p) => p.id === id || p.prescriptionCode === id
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createPrescription(
    dto: CreatePrescriptionDTO
  ): Promise<Prescription> {
    if (!dto.patientId) {
      throw new ValidationError("patientId is required to create a prescription.");
    }

    if (dto.items && dto.items.length > 0) {
      for (const it of dto.items) {
        if (!it.brandName?.trim() || !it.genericName?.trim()) {
          throw new ValidationError("Every prescribed item must include brandName and genericName.");
        }
        if (!it.frequency?.trim()) {
          throw new ValidationError(
            `Prescribed medication "${it.brandName}" requires an explicitly confirmed frequency (e.g. 1+0+1).`
          );
        }
      }
    }

    const prescriptionId = `rx-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const isFinalized = dto.status === "finalized";

    const items: PrescriptionItem[] = (dto.items || []).map((item, idx) => ({
      id: item.id || `item-mock-${Date.now()}-${idx}`,
      prescriptionId,
      medicineId: item.medicineId,
      brandName: item.brandName.trim(),
      genericName: item.genericName.trim(),
      strength: item.strength?.trim(),
      dosageForm: item.dosageForm?.trim(),
      manufacturer: item.manufacturer?.trim(),
      dose: item.dose?.trim(),
      frequency: item.frequency.trim(),
      route: item.route?.trim() || "Oral",
      duration: item.duration?.trim(),
      timingInstructions: item.timingInstructions?.trim(),
      specialInstructions: item.specialInstructions?.trim(),
      orderIndex: item.orderIndex !== undefined ? item.orderIndex : idx,
      createdAt: now,
      updatedAt: now,
    }));

    const prescription: Prescription = {
      id: prescriptionId,
      prescriptionCode: this.generateCode(),
      patientId: dto.patientId,
      chamberId: dto.chamberId,
      consultationId: dto.consultationId,
      doctorId: dto.doctorId || "dr-tashfin",
      prescriptionDate: dto.prescriptionDate || now.split("T")[0],
      status: dto.status || "draft",
      finalizedAt: isFinalized ? now : undefined,
      advice: dto.advice?.trim(),
      followUpDate: dto.followUpDate,
      followUpInstructions: dto.followUpInstructions?.trim(),
      notes: dto.notes?.trim(),
      items: items.sort((a, b) => a.orderIndex - b.orderIndex),
      createdAt: now,
      updatedAt: now,
    };

    const all = this.getAllInternal();
    all.push(prescription);
    this.saveAllInternal(all);
    return JSON.parse(JSON.stringify(prescription));
  }

  public async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDTO
  ): Promise<Prescription> {
    const all = this.getAllInternal();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    const existing = all[idx];
    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot modify a finalized prescription. Clinical records are locked for audit integrity."
      );
    }

    if (dto.items !== undefined && dto.items.length > 0) {
      for (const it of dto.items) {
        if (!it.brandName?.trim() || !it.genericName?.trim()) {
          throw new ValidationError("Every prescribed item must include brandName and genericName.");
        }
        if (!it.frequency?.trim()) {
          throw new ValidationError(
            `Prescribed medication "${it.brandName}" requires an explicitly confirmed frequency (e.g. 1+0+1).`
          );
        }
      }
    }

    const now = new Date().toISOString();

    let items = existing.items;
    if (dto.items !== undefined) {
      items = dto.items.map((item, i) => ({
        id: item.id || `item-mock-${Date.now()}-${i}`,
        prescriptionId: id,
        medicineId: item.medicineId,
        brandName: item.brandName.trim(),
        genericName: item.genericName.trim(),
        strength: item.strength?.trim(),
        dosageForm: item.dosageForm?.trim(),
        manufacturer: item.manufacturer?.trim(),
        dose: item.dose?.trim(),
        frequency: item.frequency.trim(),
        route: item.route?.trim() || "Oral",
        duration: item.duration?.trim(),
        timingInstructions: item.timingInstructions?.trim(),
        specialInstructions: item.specialInstructions?.trim(),
        orderIndex: item.orderIndex !== undefined ? item.orderIndex : i,
        createdAt: now,
        updatedAt: now,
      })).sort((a, b) => a.orderIndex - b.orderIndex);
    }

    const updated: Prescription = {
      ...existing,
      advice: dto.advice !== undefined ? dto.advice?.trim() : existing.advice,
      followUpDate: dto.followUpDate !== undefined ? dto.followUpDate : existing.followUpDate,
      followUpInstructions:
        dto.followUpInstructions !== undefined
          ? dto.followUpInstructions?.trim()
          : existing.followUpInstructions,
      notes: dto.notes !== undefined ? dto.notes?.trim() : existing.notes,
      prescriptionDate:
        dto.prescriptionDate !== undefined ? dto.prescriptionDate : existing.prescriptionDate,
      items,
      updatedAt: now,
    };

    all[idx] = updated;
    this.saveAllInternal(all);
    return JSON.parse(JSON.stringify(updated));
  }

  public async finalizePrescription(id: string): Promise<Prescription> {
    const all = this.getAllInternal();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    const existing = all[idx];
    if (existing.status === "finalized") {
      return JSON.parse(JSON.stringify(existing));
    }

    const now = new Date().toISOString();
    const finalized: Prescription = {
      ...existing,
      status: "finalized",
      finalizedAt: now,
      updatedAt: now,
    };

    all[idx] = finalized;
    this.saveAllInternal(all);
    return JSON.parse(JSON.stringify(finalized));
  }

  public async deleteDraftPrescription(id: string): Promise<boolean> {
    const all = this.getAllInternal();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    const existing = all[idx];
    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot delete a finalized prescription. Finalized clinical records are immutable."
      );
    }

    all.splice(idx, 1);
    this.saveAllInternal(all);
    return true;
  }

  public async attachArchivedDocument(
    prescriptionId: string,
    metadata: {
      archivedDocumentId: string;
      archivedPdfKey: string;
      archivedPdfHash: string;
      archivedPdfSize: number;
      archiveVersion: number;
      archivedAt: string;
    }
  ): Promise<Prescription> {
    const all = this.getAllInternal();
    const idx = all.findIndex((p) => p.id === prescriptionId);
    if (idx === -1) {
      throw new DataError(`Prescription "${prescriptionId}" not found`);
    }

    const updated: Prescription = {
      ...all[idx],
      archivedDocumentId: metadata.archivedDocumentId,
      archivedPdfKey: metadata.archivedPdfKey,
      archivedPdfHash: metadata.archivedPdfHash,
      archivedPdfSize: metadata.archivedPdfSize,
      archiveVersion: metadata.archiveVersion,
      archivedAt: metadata.archivedAt,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    this.saveAllInternal(all);
    return JSON.parse(JSON.stringify(updated));
  }
}
