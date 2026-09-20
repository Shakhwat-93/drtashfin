/**
 * Development-safe Patient ID Generator.
 * Generates human-readable sequential patient identifiers formatted as "PT-000001".
 *
 * NOTE: When migrating to PostgreSQL / Supabase, this will be handled by a database
 * sequence or trigger (e.g., 'PT-' || LPAD(nextval('patient_id_seq')::text, 6, '0')).
 */

export function formatPatientId(sequenceNumber: number): string {
  const padded = String(Math.max(1, sequenceNumber)).padStart(6, "0");
  return `PT-${padded}`;
}

export function parsePatientSequence(patientId: string): number {
  const match = patientId.match(/^PT-(\d+)$/i);
  if (!match || !match[1]) return 0;
  return parseInt(match[1], 10);
}

/**
 * Generate a local UUID for internal records (RFC4122 compliant fallback).
 */
export function generateInternalUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older test runners or environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
