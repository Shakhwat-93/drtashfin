import { IChamberRepository } from "./chamber-repository.interface";
import { Chamber, ChamberStats, KNOWN_CHAMBERS, DEMO_CHAMBERS } from "@/types/chamber";

function isClientDemoMode(): boolean {
  if (typeof window !== "undefined") {
    try {
      return (
        document.cookie.includes("dr_is_demo=true") ||
        localStorage.getItem("dr_is_demo") === "true"
      );
    } catch {
      return false;
    }
  }
  return false;
}

export class MockChamberRepository implements IChamberRepository {
  private getChamberSource(): Chamber[] {
    if (isClientDemoMode()) {
      return JSON.parse(JSON.stringify(DEMO_CHAMBERS));
    }
    return JSON.parse(JSON.stringify(KNOWN_CHAMBERS));
  }

  public async getChambers(activeOnly = true): Promise<Chamber[]> {
    const list = this.getChamberSource();
    if (activeOnly) {
      return list.filter((c) => c.isActive);
    }
    return [...list];
  }

  public async getChamberById(id: string): Promise<Chamber | null> {
    const list = this.getChamberSource();
    const found = list.find((c) => c.id === id);
    if (found) return { ...found };
    // Cross check fallback
    const fallback =
      KNOWN_CHAMBERS.find((c) => c.id === id) ||
      DEMO_CHAMBERS.find((c) => c.id === id);
    return fallback ? { ...fallback } : null;
  }

  public async getChamberByCode(code: string): Promise<Chamber | null> {
    const list = this.getChamberSource();
    const normalized = code.toLowerCase().trim();
    const found = list.find((c) => c.code.toLowerCase() === normalized);
    if (found) return { ...found };
    const fallback =
      KNOWN_CHAMBERS.find((c) => c.code.toLowerCase() === normalized) ||
      DEMO_CHAMBERS.find((c) => c.code.toLowerCase() === normalized);
    return fallback ? { ...fallback } : null;
  }

  public async getChamberStats(chamberId: string): Promise<ChamberStats | null> {
    const chamber = await this.getChamberById(chamberId);
    if (!chamber) return null;

    return {
      chamberId: chamber.id,
      chamberCode: chamber.code,
      chamberName: chamber.name,
      totalPatients: 0,
      todayPatients: 0,
      todayFollowUps: 0,
    };
  }
}
