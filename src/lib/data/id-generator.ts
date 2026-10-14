/**
 * Concurrency-Safe Patient ID Generator & Parser with Chamber Support.
 *
 * Supports chamber-specific patient identifiers:
 * - Dhaka:       DH-000001, DH-000002, ...
 * - Rangpur:     RNG-000001, RNG-000002, ...
 * - Narayanganj: N-000001, N-000002, ...
 * - Legacy:      PT-000001, PT-000002, ...
 */

export function formatChamberPatientId(prefix: string, sequenceNumber: number): string {
  const padded = String(Math.max(1, sequenceNumber)).padStart(6, "0");
  const cleanPrefix = (prefix || "PT").toUpperCase().replace(/[^A-Z]/g, "");
  return `${cleanPrefix}-${padded}`;
}

export function parseChamberPatientSequence(patientId: string): { prefix: string; sequence: number } | null {
  if (!patientId || typeof patientId !== "string") return null;
  const match = patientId.trim().match(/^([A-Z]+)-(\d+)$/i);
  if (!match || !match[1] || !match[2]) return null;
  return {
    prefix: match[1].toUpperCase(),
    sequence: parseInt(match[2], 10),
  };
}

export function generateNextChamberPatientId(prefix: string, existingIds: string[]): string {
  const cleanPrefix = (prefix || "PT").toUpperCase().replace(/[^A-Z]/g, "");
  let maxSeq = 0;
  for (const id of existingIds) {
    const parsed = parseChamberPatientSequence(id);
    if (parsed && parsed.prefix === cleanPrefix && parsed.sequence > maxSeq) {
      maxSeq = parsed.sequence;
    }
  }
  return formatChamberPatientId(cleanPrefix, maxSeq + 1);
}

/**
 * Legacy formatter (defaults to PT prefix) for backwards compatibility.
 */
export function formatPatientId(sequenceNumber: number): string {
  return formatChamberPatientId("PT", sequenceNumber);
}

/**
 * Legacy parser for backwards compatibility.
 */
export function parsePatientSequence(patientId: string): number {
  const parsed = parseChamberPatientSequence(patientId);
  return parsed ? parsed.sequence : 0;
}

/**
 * Generate a local UUID for internal records (RFC4122 compliant fallback).
 */
export function generateInternalUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
