import { IChamberRepository } from "./chamber-repository.interface";
import { Chamber, ChamberStats, KNOWN_CHAMBERS } from "@/types/chamber";

export class MockChamberRepository implements IChamberRepository {
  private chambers: Chamber[];

  constructor() {
    this.chambers = JSON.parse(JSON.stringify(KNOWN_CHAMBERS));
  }

  public async getChambers(activeOnly = true): Promise<Chamber[]> {
    if (activeOnly) {
      return this.chambers.filter((c) => c.isActive);
    }
    return [...this.chambers];
  }

  public async getChamberById(id: string): Promise<Chamber | null> {
    const found = this.chambers.find((c) => c.id === id);
    return found ? { ...found } : null;
  }

  public async getChamberByCode(code: string): Promise<Chamber | null> {
    const normalized = code.toLowerCase().trim();
    const found = this.chambers.find((c) => c.code.toLowerCase() === normalized);
    return found ? { ...found } : null;
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
