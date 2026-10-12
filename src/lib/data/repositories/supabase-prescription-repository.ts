import { SupabaseClient } from "@supabase/supabase-js";
import { IPrescriptionRepository } from "./prescription-repository.interface";
import {
  Prescription,
  PrescriptionItem,
  CreatePrescriptionDTO,
  UpdatePrescriptionDTO,
} from "@/types/prescription";
import { supabase } from "@/lib/supabase/client";
import { DataError } from "../errors";

function mapPrescriptionItemFromRow(row: Record<string, unknown>): PrescriptionItem {
  return {
    id: String(row.id),
    prescriptionId: String(row.prescription_id),
    medicineId: row.medicine_id ? String(row.medicine_id) : undefined,
    brandName: String(row.brand_name),
    genericName: String(row.generic_name),
    strength: row.strength ? String(row.strength) : undefined,
    dosageForm: row.dosage_form ? String(row.dosage_form) : undefined,
    manufacturer: row.manufacturer ? String(row.manufacturer) : undefined,
    dose: row.dose ? String(row.dose) : undefined,
    frequency: String(row.frequency || ""),
    route: String(row.route || "Oral"),
    duration: row.duration ? String(row.duration) : undefined,
    timingInstructions: row.timing_instructions ? String(row.timing_instructions) : undefined,
    specialInstructions: row.special_instructions ? String(row.special_instructions) : undefined,
    orderIndex: Number(row.order_index ?? 0),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapPrescriptionFromRow(
  row: Record<string, unknown>,
  itemRows: Record<string, unknown>[] = []
): Prescription {
  const items = itemRows
    .map(mapPrescriptionItemFromRow)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    id: String(row.id),
    prescriptionCode: String(row.prescription_code),
    patientId: String(row.patient_id),
    consultationId: row.consultation_id ? String(row.consultation_id) : undefined,
    doctorId: String(row.doctor_id || "dr-tashfin"),
    prescriptionDate: String(row.prescription_date),
    status: (row.status as Prescription["status"]) || "draft",
    finalizedAt: row.finalized_at ? String(row.finalized_at) : undefined,
    advice: row.advice ? String(row.advice) : undefined,
    followUpDate: row.follow_up_date ? String(row.follow_up_date) : undefined,
    followUpInstructions: row.follow_up_instructions
      ? String(row.follow_up_instructions)
      : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    items,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabasePrescriptionRepository implements IPrescriptionRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public async getPrescriptionsByPatientId(
    patientId: string
  ): Promise<Prescription[]> {
    if (!patientId) return [];

    const { data, error } = await this.client
      .from("prescriptions")
      .select("*, prescription_items(*)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new DataError(
        `Failed to fetch patient prescriptions: ${error.message}`,
        error.code
      );
    }

    return (data || []).map((row) =>
      mapPrescriptionFromRow(row, (row.prescription_items as Record<string, unknown>[]) || [])
    );
  }

  public async getPrescriptionByConsultationId(
    consultationId: string
  ): Promise<Prescription | null> {
    if (!consultationId) return null;

    const { data, error } = await this.client
      .from("prescriptions")
      .select("*, prescription_items(*)")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new DataError(
        `Failed to fetch consultation prescription: ${error.message}`,
        error.code
      );
    }

    if (!data) return null;
    return mapPrescriptionFromRow(
      data,
      (data.prescription_items as Record<string, unknown>[]) || []
    );
  }

  public async getPrescriptionById(id: string): Promise<Prescription | null> {
    if (!id) return null;

    const { data, error } = await this.client
      .from("prescriptions")
      .select("*, prescription_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(
        `Failed to fetch prescription by id: ${error.message}`,
        error.code
      );
    }

    if (!data) return null;
    return mapPrescriptionFromRow(
      data,
      (data.prescription_items as Record<string, unknown>[]) || []
    );
  }

  public async createPrescription(
    dto: CreatePrescriptionDTO
  ): Promise<Prescription> {
    if (!dto.patientId) {
      throw new DataError("patientId is required to create a prescription");
    }

    const prescriptionPayload = {
      patient_id: dto.patientId,
      consultation_id: dto.consultationId || null,
      doctor_id: dto.doctorId || "dr-tashfin",
      prescription_date: dto.prescriptionDate || new Date().toISOString().split("T")[0],
      status: dto.status || "draft",
      finalized_at: dto.status === "finalized" ? new Date().toISOString() : null,
      advice: dto.advice?.trim() || null,
      follow_up_date: dto.followUpDate || null,
      follow_up_instructions: dto.followUpInstructions?.trim() || null,
      notes: dto.notes?.trim() || null,
    };

    const { data: createdRow, error: pError } = await this.client
      .from("prescriptions")
      .insert(prescriptionPayload)
      .select()
      .single();

    if (pError || !createdRow) {
      throw new DataError(
        `Failed to create prescription record: ${pError?.message}`,
        pError?.code
      );
    }

    const prescriptionId = createdRow.id;
    let insertedItems: Record<string, unknown>[] = [];

    if (dto.items && dto.items.length > 0) {
      const itemsPayload = dto.items.map((item, index) => ({
        prescription_id: prescriptionId,
        medicine_id: item.medicineId || null,
        brand_name: item.brandName.trim(),
        generic_name: item.genericName.trim(),
        strength: item.strength?.trim() || null,
        dosage_form: item.dosageForm?.trim() || null,
        manufacturer: item.manufacturer?.trim() || null,
        dose: item.dose?.trim() || null,
        frequency: item.frequency.trim(),
        route: item.route?.trim() || "Oral",
        duration: item.duration?.trim() || null,
        timing_instructions: item.timingInstructions?.trim() || null,
        special_instructions: item.specialInstructions?.trim() || null,
        order_index: item.orderIndex !== undefined ? item.orderIndex : index,
      }));

      const { data: itemRows, error: iError } = await this.client
        .from("prescription_items")
        .insert(itemsPayload)
        .select();

      if (iError) {
        throw new DataError(
          `Failed to save prescription items: ${iError.message}`,
          iError.code
        );
      }
      insertedItems = (itemRows as Record<string, unknown>[]) || [];
    }

    return mapPrescriptionFromRow(createdRow, insertedItems);
  }

  public async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDTO
  ): Promise<Prescription> {
    const existing = await this.getPrescriptionById(id);
    if (!existing) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot modify a finalized prescription. Clinical records are locked for audit integrity."
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (dto.advice !== undefined) updatePayload.advice = dto.advice?.trim() || null;
    if (dto.followUpDate !== undefined) updatePayload.follow_up_date = dto.followUpDate || null;
    if (dto.followUpInstructions !== undefined) {
      updatePayload.follow_up_instructions = dto.followUpInstructions?.trim() || null;
    }
    if (dto.notes !== undefined) updatePayload.notes = dto.notes?.trim() || null;
    if (dto.prescriptionDate !== undefined) updatePayload.prescription_date = dto.prescriptionDate;

    const { data: updatedRow, error: pError } = await this.client
      .from("prescriptions")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (pError || !updatedRow) {
      throw new DataError(
        `Failed to update prescription: ${pError?.message}`,
        pError?.code
      );
    }

    let itemRows: Record<string, unknown>[] = [];

    // Replace items if provided
    if (dto.items !== undefined) {
      const { error: delError } = await this.client
        .from("prescription_items")
        .delete()
        .eq("prescription_id", id);

      if (delError) {
        throw new DataError(
          `Failed to sync prescription items: ${delError.message}`,
          delError.code
        );
      }

      if (dto.items.length > 0) {
        const itemsPayload = dto.items.map((item, index) => ({
          prescription_id: id,
          medicine_id: item.medicineId || null,
          brand_name: item.brandName.trim(),
          generic_name: item.genericName.trim(),
          strength: item.strength?.trim() || null,
          dosage_form: item.dosageForm?.trim() || null,
          manufacturer: item.manufacturer?.trim() || null,
          dose: item.dose?.trim() || null,
          frequency: item.frequency.trim(),
          route: item.route?.trim() || "Oral",
          duration: item.duration?.trim() || null,
          timing_instructions: item.timingInstructions?.trim() || null,
          special_instructions: item.specialInstructions?.trim() || null,
          order_index: item.orderIndex !== undefined ? item.orderIndex : index,
        }));

        const { data: newItems, error: insError } = await this.client
          .from("prescription_items")
          .insert(itemsPayload)
          .select();

        if (insError) {
          throw new DataError(
            `Failed to insert updated prescription items: ${insError.message}`,
            insError.code
          );
        }
        itemRows = (newItems as Record<string, unknown>[]) || [];
      }
    } else {
      // Keep existing items
      const { data: existingItems } = await this.client
        .from("prescription_items")
        .select("*")
        .eq("prescription_id", id)
        .order("order_index", { ascending: true });
      itemRows = (existingItems as Record<string, unknown>[]) || [];
    }

    return mapPrescriptionFromRow(updatedRow, itemRows);
  }

  public async finalizePrescription(id: string): Promise<Prescription> {
    const existing = await this.getPrescriptionById(id);
    if (!existing) {
      throw new DataError(`Prescription with id "${id}" not found.`);
    }

    if (existing.status === "finalized") {
      return existing; // Already finalized
    }

    const { data: finalizedRow, error } = await this.client
      .from("prescriptions")
      .update({
        status: "finalized",
        finalized_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, prescription_items(*)")
      .single();

    if (error || !finalizedRow) {
      throw new DataError(
        `Failed to finalize prescription: ${error?.message}`,
        error?.code
      );
    }

    return mapPrescriptionFromRow(
      finalizedRow,
      (finalizedRow.prescription_items as Record<string, unknown>[]) || []
    );
  }

  public async deleteDraftPrescription(id: string): Promise<boolean> {
    const existing = await this.getPrescriptionById(id);
    if (!existing) return false;

    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot delete a finalized prescription. Finalized clinical records are immutable."
      );
    }

    const { error } = await this.client
      .from("prescriptions")
      .delete()
      .eq("id", id);

    if (error) {
      throw new DataError(
        `Failed to delete draft prescription: ${error.message}`,
        error.code
      );
    }

    return true;
  }
}
