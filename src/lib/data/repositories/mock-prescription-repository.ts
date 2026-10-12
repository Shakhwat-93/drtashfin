import { IPrescriptionRepository } from "./prescription-repository.interface";
import {
  Prescription,
  PrescriptionItem,
  CreatePrescriptionDTO,
  UpdatePrescriptionDTO,
} from "@/types/prescription";
import { DataError } from "../errors";

export class MockPrescriptionRepository implements IPrescriptionRepository {
  private prescriptions: Prescription[] = [];
  private codeCounter = 1;

  constructor(initialData: Prescription[] = []) {
    this.prescriptions = [...initialData];
  }

  private generateCode(): string {
    const code = `RX-${String(this.codeCounter).padStart(6, "0")}`;
    this.codeCounter++;
    return code;
  }

  public async getPrescriptionsByPatientId(
    patientId: string
  ): Promise<Prescription[]> {
    return this.prescriptions
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getPrescriptionByConsultationId(
    consultationId: string
  ): Promise<Prescription | null> {
    const found = this.prescriptions
      .filter((p) => p.consultationId === consultationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async getPrescriptionById(id: string): Promise<Prescription | null> {
    const found = this.prescriptions.find((p) => p.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createPrescription(
    dto: CreatePrescriptionDTO
  ): Promise<Prescription> {
    if (!dto.patientId) {
      throw new DataError("patientId is required to create a prescription");
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

    this.prescriptions.push(prescription);
    return JSON.parse(JSON.stringify(prescription));
  }

  public async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDTO
  ): Promise<Prescription> {
    const idx = this.prescriptions.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    const existing = this.prescriptions[idx];
    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot modify a finalized prescription. Clinical records are locked for audit integrity."
      );
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

    this.prescriptions[idx] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  public async finalizePrescription(id: string): Promise<Prescription> {
    const idx = this.prescriptions.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    const existing = this.prescriptions[idx];
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

    this.prescriptions[idx] = finalized;
    return JSON.parse(JSON.stringify(finalized));
  }

  public async deleteDraftPrescription(id: string): Promise<boolean> {
    const idx = this.prescriptions.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    const existing = this.prescriptions[idx];
    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot delete a finalized prescription. Finalized clinical records are immutable."
      );
    }

    this.prescriptions.splice(idx, 1);
    return true;
  }
}
