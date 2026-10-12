"use client";

import * as React from "react";
import {
  Prescription,
  CreatePrescriptionDTO,
  UpdatePrescriptionDTO,
} from "@/types/prescription";
import { getPrescriptionRepository } from "@/lib/data";

export interface UsePrescriptionsResult {
  prescriptions: Prescription[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPrescription: (data: CreatePrescriptionDTO) => Promise<Prescription>;
  updatePrescription: (
    id: string,
    data: UpdatePrescriptionDTO
  ) => Promise<Prescription>;
  finalizePrescription: (id: string) => Promise<Prescription>;
  deleteDraft: (id: string) => Promise<boolean>;
}

export function usePrescriptions(patientId?: string): UsePrescriptionsResult {
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = React.useState(Boolean(patientId));
  const [error, setError] = React.useState<string | null>(null);

  const fetchPrescriptions = React.useCallback(async () => {
    if (!patientId) {
      setPrescriptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const repo = getPrescriptionRepository();
      const list = await repo.getPrescriptionsByPatientId(patientId);
      setPrescriptions(list);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load prescriptions.";
      console.error("Failed to load prescriptions:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const createPrescription = React.useCallback(
    async (data: CreatePrescriptionDTO): Promise<Prescription> => {
      const repo = getPrescriptionRepository();
      const created = await repo.createPrescription(data);
      setPrescriptions((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updatePrescription = React.useCallback(
    async (
      id: string,
      data: UpdatePrescriptionDTO
    ): Promise<Prescription> => {
      const repo = getPrescriptionRepository();
      const updated = await repo.updatePrescription(id, data);
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
      return updated;
    },
    []
  );

  const finalizePrescription = React.useCallback(
    async (id: string): Promise<Prescription> => {
      const repo = getPrescriptionRepository();
      const finalized = await repo.finalizePrescription(id);
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === id ? finalized : p))
      );
      return finalized;
    },
    []
  );

  const deleteDraft = React.useCallback(
    async (id: string): Promise<boolean> => {
      const repo = getPrescriptionRepository();
      const success = await repo.deleteDraftPrescription(id);
      if (success) {
        setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      }
      return success;
    },
    []
  );

  return {
    prescriptions,
    isLoading,
    error,
    refresh: fetchPrescriptions,
    createPrescription,
    updatePrescription,
    finalizePrescription,
    deleteDraft,
  };
}

export function useSinglePrescription(prescriptionId?: string) {
  const [prescription, setPrescription] = React.useState<Prescription | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(Boolean(prescriptionId));
  const [error, setError] = React.useState<string | null>(null);

  const fetchPrescription = React.useCallback(async () => {
    if (!prescriptionId) {
      setPrescription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const repo = getPrescriptionRepository();
      const data = await repo.getPrescriptionById(prescriptionId);
      setPrescription(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load prescription.";
      console.error("Failed to load prescription:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [prescriptionId]);

  React.useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  return {
    prescription,
    isLoading,
    error,
    refresh: fetchPrescription,
    setPrescription,
  };
}
