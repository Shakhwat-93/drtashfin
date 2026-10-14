import { Chamber, ChamberStats } from "@/types/chamber";

export interface IChamberRepository {
  getChambers(activeOnly?: boolean): Promise<Chamber[]>;
  getChamberById(id: string): Promise<Chamber | null>;
  getChamberByCode(code: string): Promise<Chamber | null>;
  getChamberStats(chamberId: string): Promise<ChamberStats | null>;
}
