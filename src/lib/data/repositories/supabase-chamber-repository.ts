import { SupabaseClient } from "@supabase/supabase-js";
import { IChamberRepository } from "./chamber-repository.interface";
import { Chamber, ChamberStats, KNOWN_CHAMBERS } from "@/types/chamber";
import { supabase } from "@/lib/supabase/client";

function mapChamberFromRow(row: Record<string, unknown>): Chamber {
  return {
    id: String(row.id),
    code: String(row.code) as Chamber["code"],
    name: String(row.name),
    patientIdPrefix: String(row.patient_id_prefix) as Chamber["patientIdPrefix"],
    address: row.address ? String(row.address) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseChamberRepository implements IChamberRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public async getChambers(activeOnly = true): Promise<Chamber[]> {
    let query = this.client.from("chambers").select("*").order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Fallback to static known chambers if table is empty or during cold boot
      return activeOnly ? KNOWN_CHAMBERS.filter((c) => c.isActive) : KNOWN_CHAMBERS;
    }

    return data.map(mapChamberFromRow);
  }

  public async getChamberById(id: string): Promise<Chamber | null> {
    if (!id) return null;

    const { data, error } = await this.client
      .from("chambers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      const fallback = KNOWN_CHAMBERS.find((c) => c.id === id);
      return fallback || null;
    }

    return mapChamberFromRow(data);
  }

  public async getChamberByCode(code: string): Promise<Chamber | null> {
    if (!code) return null;
    const normalized = code.toLowerCase().trim();

    const { data, error } = await this.client
      .from("chambers")
      .select("*")
      .eq("code", normalized)
      .maybeSingle();

    if (error || !data) {
      const fallback = KNOWN_CHAMBERS.find((c) => c.code.toLowerCase() === normalized);
      return fallback || null;
    }

    return mapChamberFromRow(data);
  }

  public async getChamberStats(chamberId: string): Promise<ChamberStats | null> {
    const chamber = await this.getChamberById(chamberId);
    if (!chamber) return null;

    const todayStr = new Date().toISOString().split("T")[0];

    // Total Patients in this Chamber
    const { count: totalPatients } = await this.client
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("chamber_id", chamber.id);

    // Today's Consultations in this Chamber
    const { count: todayPatients } = await this.client
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("chamber_id", chamber.id)
      .eq("consultation_date", todayStr);

    // Today's Follow-ups in this Chamber
    const { count: todayFollowUps } = await this.client
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("chamber_id", chamber.id)
      .eq("next_follow_up", todayStr);

    return {
      chamberId: chamber.id,
      chamberCode: chamber.code,
      chamberName: chamber.name,
      totalPatients: totalPatients ?? 0,
      todayPatients: todayPatients ?? 0,
      todayFollowUps: todayFollowUps ?? 0,
    };
  }
}
