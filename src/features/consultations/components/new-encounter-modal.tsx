"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Search,
  User,
  Calendar,
  Clock,
  Building2,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/types/patient";
import { CreateConsultationDTO } from "@/types/consultation";
import { getPatientRepository, getConsultationRepository } from "@/lib/data";

export interface NewEncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultChamberId?: string;
  chambers?: Array<{ id: string; name: string; code: string; patientIdPrefix: string }>;
}

export function NewEncounterModal({
  isOpen,
  onClose,
  onSuccess,
  defaultChamberId = "all",
  chambers = [],
}: NewEncounterModalProps) {
  const router = useRouter();

  // Patient selection state
  const [patientSearch, setPatientSearch] = React.useState("");
  const [patientResults, setPatientResults] = React.useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  // Encounter form fields
  const [chamberId, setChamberId] = React.useState<string>(() => {
    if (defaultChamberId && defaultChamberId !== "all") return defaultChamberId;
    return chambers[0]?.id || "";
  });
  const [consultationDate, setConsultationDate] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [consultationTime, setConsultationTime] = React.useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = React.useState("");
  const [clinicalNotes, setClinicalNotes] = React.useState("");
  const [nextFollowUp, setNextFollowUp] = React.useState("");

  // Submitting & status
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Reset form when modal opens or closes
  React.useEffect(() => {
    if (isOpen) {
      setPatientSearch("");
      setPatientResults([]);
      setSelectedPatient(null);
      setChamberId(defaultChamberId && defaultChamberId !== "all" ? defaultChamberId : chambers[0]?.id || "");
      setConsultationDate(new Date().toISOString().split("T")[0]);
      setConsultationTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setChiefComplaint("");
      setProvisionalDiagnosis("");
      setClinicalNotes("");
      setNextFollowUp("");
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultChamberId, chambers]);

  // Live debounced search for patients
  React.useEffect(() => {
    if (!isOpen || selectedPatient) return;

    const trimmed = patientSearch.trim();
    if (!trimmed) {
      setPatientResults([]);
      setIsSearchingPatient(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPatient(true);
      try {
        const repo = getPatientRepository();
        const res = await repo.getPatients({
          search: trimmed,
          page: 1,
          pageSize: 8,
        });
        setPatientResults(res.items);
      } catch (err) {
        console.error("Failed to search patients:", err);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, patientSearch, selectedPatient]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    if (patient.chamberId) {
      setChamberId(patient.chamberId);
    }
    setErrorMessage(null);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch("");
  };

  const handleSaveEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMessage("Please select a patient before saving the encounter.");
      return;
    }

    if (!consultationDate) {
      setErrorMessage("Consultation date is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const repo = getConsultationRepository();
      const payload: CreateConsultationDTO = {
        patientId: selectedPatient.patientId,
        chamberId: chamberId || selectedPatient.chamberId || undefined,
        consultationDate,
        consultationTime: consultationTime || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
        provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        plan: clinicalNotes.trim() || undefined,
        nextFollowUp: nextFollowUp || undefined,
        status: "completed",
      };

      await repo.createConsultation(payload);

      setSuccessMessage("Consultation record saved successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to record consultation."
      );
      setIsSubmitting(false);
    }
  };

  const handleOpenFullForm = () => {
    if (!selectedPatient) return;
    const cid = chamberId || selectedPatient.chamberId || "";
    router.push(
      `/patients/${selectedPatient.patientId}/consultations/new${cid ? `?chamberId=${cid}` : ""}`
    );
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[92vh] flex flex-col p-0">
      <ModalHeader className="px-6 pt-6 pb-4 border-b border-[#EAE3D9]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-[#DE4F3C]" />
          </div>
          <div>
            <ModalTitle className="text-base font-bold text-[#201C1A]">
              Record New Clinical Encounter
            </ModalTitle>
            <ModalDescription className="text-xs text-[#7A746F]">
              Search or select an active patient, record clinical findings, and register the consultation.
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <form onSubmit={handleSaveEncounter} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. Patient Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
            1. Select Patient <span className="text-[#DE4F3C]">*</span>
          </label>

          {!selectedPatient ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                <Input
                  type="search"
                  placeholder="Type patient name, phone, or ID (e.g. DH-000001, PT-000012)..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9 bg-white"
                  autoFocus
                />
              </div>

              {isSearchingPatient && (
                <div className="p-3 text-xs text-[#7A746F] text-center bg-[#FAF5EE]/50 rounded-lg">
                  Searching patient database...
                </div>
              )}

              {!isSearchingPatient && patientResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[#EAE3D9] bg-white divide-y divide-[#EAE3D9] shadow-xs">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full text-left p-3 hover:bg-[#FAF5EE] transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#201C1A]">{p.name}</div>
                        <div className="text-[11px] text-[#7A746F] flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[#DE4F3C] font-medium">{p.patientId}</span>
                          <span>•</span>
                          <span>{p.phone}</span>
                          <span>•</span>
                          <span>{p.gender}, {p.age ? `${p.age}y` : "Age N/A"}</span>
                        </div>
                      </div>
                      <Badge variant="neutral" className="text-[10px]">
                        Select
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {!isSearchingPatient && patientSearch.trim().length > 1 && patientResults.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-[#EAE3D9] text-center text-xs text-[#7A746F] space-y-1">
                  <p>No matching patient found for &quot;{patientSearch}&quot;.</p>
                  <p className="text-[11px]">
                    Ensure the ID starts with DH-, RNG-, N-, or PT-, or register the patient first.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white border border-[#EAE3D9] flex items-center justify-center text-[#DE4F3C]">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#201C1A]">{selectedPatient.name}</div>
                  <div className="text-[11px] text-[#7A746F] flex items-center gap-2">
                    <span className="font-mono text-[#DE4F3C] font-semibold">{selectedPatient.patientId}</span>
                    <span>•</span>
                    <span>{selectedPatient.phone}</span>
                    <span>•</span>
                    <span>{selectedPatient.gender}, {selectedPatient.age ? `${selectedPatient.age} yrs` : "Age N/A"}</span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearPatient}
                className="h-7 text-[11px] text-[#7A746F]"
              >
                Change Patient
              </Button>
            </div>
          )}
        </div>

        {/* 2. Chamber & Date Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Chamber</span>
            </label>
            <select
              value={chamberId}
              onChange={(e) => setChamberId(e.target.value)}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#EAE3D9] bg-white text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#DE4F3C]"
            >
              {chambers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.patientIdPrefix})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Consultation Date</span>
            </label>
            <Input
              type="date"
              value={consultationDate}
              onChange={(e) => setConsultationDate(e.target.value)}
              className="h-9 text-xs bg-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Consultation Time</span>
            </label>
            <Input
              type="text"
              value={consultationTime}
              onChange={(e) => setConsultationTime(e.target.value)}
              placeholder="e.g. 10:30 AM"
              className="h-9 text-xs bg-white"
            />
          </div>
        </div>

        {/* 3. Clinical Findings */}
        <div className="space-y-3 pt-1 border-t border-[#EAE3D9]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Chief Complaint
            </label>
            <Input
              type="text"
              placeholder="e.g. Right foot deformity since birth, Bilateral clubfoot, Pain on walking..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Provisional Diagnosis
            </label>
            <Input
              type="text"
              placeholder="e.g. Congenital Talipes Equinovarus (CTEV), Erb's Palsy, DDH..."
              value={provisionalDiagnosis}
              onChange={(e) => setProvisionalDiagnosis(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Clinical Notes &amp; Management Plan
            </label>
            <Textarea
              placeholder="Record clinical examination notes, casting schedule, surgery advice, or lifestyle instructions..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
              className="text-xs bg-white resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Next Follow-up Date (Optional)</span>
            </label>
            <Input
              type="date"
              value={nextFollowUp}
              onChange={(e) => setNextFollowUp(e.target.value)}
              className="h-9 text-xs bg-white max-w-xs"
            />
          </div>
        </div>
      </form>

      <ModalFooter className="px-6 py-3.5 border-t border-[#EAE3D9] bg-[#FAF5EE]/40 flex flex-wrap items-center justify-between gap-2">
        <div>
          {selectedPatient && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenFullForm}
              className="h-9 text-xs gap-1.5 text-[#DE4F3C] border-[#DE4F3C]/30 hover:bg-[#DE4F3C]/5"
              title="Open full specialized clinical form with birth history, consanguinity, and investigations"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Full Orthopaedic Form</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveEncounter}
            disabled={isSubmitting || !selectedPatient}
            className="h-9 text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isSubmitting ? "Saving Encounter..." : "Save Encounter"}</span>
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
