/**
 * Domain entity and DTO definitions for Doctor Chambers (Multi-Chamber Architecture).
 *
 * Supports three distinct practice locations:
 * - Dhaka (Prefix: DH)
 * - Rangpur (Prefix: RNG)
 * - Narayanganj (Prefix: N)
 */

export type ChamberCode = "dhaka" | "rangpur" | "narayanganj";
export type ChamberPrefix = "DH" | "RNG" | "N";

export interface Chamber {
  id: string; // Stable UUID
  code: ChamberCode;
  name: string;
  patientIdPrefix: ChamberPrefix;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChamberStats {
  chamberId: string;
  chamberCode: ChamberCode;
  chamberName: string;
  totalPatients: number;
  todayPatients: number;
  todayFollowUps: number;
}

export const KNOWN_CHAMBERS: Chamber[] = [
  {
    id: "d1a4a001-0000-4000-8000-000000000001",
    code: "dhaka",
    name: "Dhaka Chamber",
    patientIdPrefix: "DH",
    address: "Green Life Medical Centre, Green Road, Dhanmondi, Dhaka",
    phone: "+8801711000001",
    isActive: true,
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  },
  {
    id: "d1a4a002-0000-4000-8000-000000000002",
    code: "rangpur",
    name: "Rangpur Chamber",
    patientIdPrefix: "RNG",
    address: "Central Hospital & Diagnostic, Medical Road, Rangpur",
    phone: "+8801711000002",
    isActive: true,
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  },
  {
    id: "d1a4a003-0000-4000-8000-000000000003",
    code: "narayanganj",
    name: "Narayanganj Chamber",
    patientIdPrefix: "N",
    address: "Popular Diagnostic Centre, B.B. Road, Chashara, Narayanganj",
    phone: "+8801711000003",
    isActive: true,
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  },
];

export const DEFAULT_CHAMBER = KNOWN_CHAMBERS[0]; // Dhaka

export function getChamberById(id?: string | null): Chamber | undefined {
  if (!id) return undefined;
  return KNOWN_CHAMBERS.find((c) => c.id === id);
}

export function getChamberByPrefix(prefix: string): Chamber | undefined {
  return KNOWN_CHAMBERS.find(
    (c) => c.patientIdPrefix.toUpperCase() === prefix.toUpperCase()
  );
}
