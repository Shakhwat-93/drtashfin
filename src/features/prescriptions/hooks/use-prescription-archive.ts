"use client";

import * as React from "react";
import {
  DocumentIntegrityVerification,
  ClinicalDocument,
} from "@/types/clinical-document";

export interface UsePrescriptionArchiveResult {
  isArchiving: boolean;
  isVerifying: boolean;
  archiveError: string | null;
  verifyError: string | null;
  verification: DocumentIntegrityVerification | null;
  versions: ClinicalDocument[];
  isArchived: boolean;
  latestDocument: ClinicalDocument | null;
  archivePrescription: (forceNewVersion?: boolean) => Promise<boolean>;
  verifyIntegrity: () => Promise<DocumentIntegrityVerification | null>;
  refreshStatus: () => Promise<void>;
  downloadPdf: () => void;
  openPdf: () => void;
}

export function usePrescriptionArchive(
  prescriptionId?: string
): UsePrescriptionArchiveResult {
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verification, setVerification] =
    React.useState<DocumentIntegrityVerification | null>(null);
  const [versions, setVersions] = React.useState<ClinicalDocument[]>([]);
  const [latestDocument, setLatestDocument] =
    React.useState<ClinicalDocument | null>(null);
  const [isArchived, setIsArchived] = React.useState(false);

  const refreshStatus = React.useCallback(async () => {
    if (!prescriptionId) return;

    try {
      const [statusRes, versionsRes] = await Promise.all([
        fetch(`/api/prescriptions/${prescriptionId}/archive`),
        fetch(`/api/prescriptions/${prescriptionId}/versions`),
      ]);

      if (statusRes.ok) {
        const json = await statusRes.json();
        if (json.data) {
          setIsArchived(Boolean(json.data.isArchived));
          setLatestDocument(json.data.latestDocument || null);
        }
      }

      if (versionsRes.ok) {
        const vJson = await versionsRes.json();
        if (vJson.data && Array.isArray(vJson.data)) {
          setVersions(vJson.data);
        }
      }
    } catch (err) {
      console.warn("Failed to refresh archive status:", err);
    }
  }, [prescriptionId]);

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const archivePrescription = React.useCallback(
    async (forceNewVersion = false): Promise<boolean> => {
      if (!prescriptionId) return false;

      setIsArchiving(true);
      setArchiveError(null);
      try {
        const res = await fetch(`/api/prescriptions/${prescriptionId}/archive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceNewVersion }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to archive prescription to R2.");
        }

        await refreshStatus();
        return true;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to archive prescription.";
        setArchiveError(msg);
        return false;
      } finally {
        setIsArchiving(false);
      }
    },
    [prescriptionId, refreshStatus]
  );

  const verifyIntegrity = React.useCallback(async (): Promise<DocumentIntegrityVerification | null> => {
    if (!prescriptionId) return null;

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/verify`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to verify document integrity.");
      }

      setVerification(json.data);
      return json.data;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Integrity check failed.";
      setVerifyError(msg);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [prescriptionId]);

  const downloadPdf = React.useCallback(() => {
    if (!prescriptionId) return;
    const url = `/api/prescriptions/${prescriptionId}/pdf?download=1`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `Prescription-${prescriptionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [prescriptionId]);

  const openPdf = React.useCallback(() => {
    if (!prescriptionId) return;
    window.open(`/api/prescriptions/${prescriptionId}/pdf`, "_blank");
  }, [prescriptionId]);

  return {
    isArchiving,
    isVerifying,
    archiveError,
    verifyError,
    verification,
    versions,
    isArchived,
    latestDocument,
    archivePrescription,
    verifyIntegrity,
    refreshStatus,
    downloadPdf,
    openPdf,
  };
}
