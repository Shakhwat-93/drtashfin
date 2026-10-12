"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Info,
  ArrowLeft,
  Loader2,
  Building2,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { Consultation } from "@/types/consultation";
import {
  Prescription,
  CreatePrescriptionItemDTO,
} from "@/types/prescription";
import { Medicine } from "@/types/medicine";
import { MedicineSearchAutocomplete } from "@/features/medicines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { getPrescriptionRepository } from "@/lib/data";

export interface PrescriptionEditorProps {
  patient: Patient;
  consultation?: Consultation | null;
  existingPrescription?: Prescription | null;
  onSuccess?: (prescription: Prescription) => void;
  onCancel?: () => void;
}

const COMMON_FREQUENCIES = [
  "1+0+1",
  "1+1+1",
  "0+1+0",
  "1+0+0",
  "0+0+1",
  "1+0+0+1",
  "Once daily",
  "SOS (When needed)",
];

const COMMON_DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "Continue",
];

const COMMON_TIMINGS = [
  "After meal",
  "Before meal",
  "With meal",
  "At bedtime",
  "Empty stomach",
];

const COMMON_ROUTES = [
  "Oral",
  "Topical",
  "Inhalation",
  "Eye Drop",
  "Ear Drop",
  "Nasal Spray",
  "IV",
  "IM",
  "Sublingual",
];

const QUICK_ADVICE_CHIPS = [
  "Take medications after food with plenty of water.",
  "Avoid cold drinks, dust, and exposure to cold weather.",
  "Low salt and low fat diet. Avoid oily foods.",
  "Ensure adequate rest and 8 hours of sleep.",
  "Drink at least 2.5–3 liters of water daily.",
  "Check and record blood pressure twice daily.",
];

export function PrescriptionEditor({
  patient,
  consultation,
  existingPrescription,
  onSuccess,
  onCancel,
}: PrescriptionEditorProps) {
  const router = useRouter();

  // Form states
  const [items, setItems] = React.useState<CreatePrescriptionItemDTO[]>(() => {
    if (existingPrescription?.items) {
      return existingPrescription.items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        brandName: it.brandName,
        genericName: it.genericName,
        strength: it.strength,
        dosageForm: it.dosageForm,
        manufacturer: it.manufacturer,
        dose: it.dose || "",
        frequency: it.frequency,
        route: it.route || "Oral",
        duration: it.duration || "",
        timingInstructions: it.timingInstructions || "",
        specialInstructions: it.specialInstructions || "",
        orderIndex: it.orderIndex,
      }));
    }
    return [];
  });

  const [prescriptionDate, setPrescriptionDate] = React.useState<string>(
    existingPrescription?.prescriptionDate ||
      new Date().toISOString().split("T")[0]
  );
  const [advice, setAdvice] = React.useState<string>(
    existingPrescription?.advice || ""
  );
  const [followUpDate, setFollowUpDate] = React.useState<string>(
    existingPrescription?.followUpDate || ""
  );
  const [followUpInstructions, setFollowUpInstructions] = React.useState<string>(
    existingPrescription?.followUpInstructions || ""
  );
  const [notes, setNotes] = React.useState<string>(
    existingPrescription?.notes || ""
  );

  // Manual medicine entry state
  const [manualMode, setManualMode] = React.useState(false);
  const [manualBrand, setManualBrand] = React.useState("");
  const [manualGeneric, setManualGeneric] = React.useState("");
  const [manualStrength, setManualStrength] = React.useState("");
  const [manualForm, setManualForm] = React.useState("Tablet");

  // Interaction states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  // Track dirty state
  React.useEffect(() => {
    setIsDirty(true);
  }, [items, advice, followUpDate, followUpInstructions, notes, prescriptionDate]);

  // Warn on browser navigation if unsaved changes exist
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && items.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, items.length]);

  const handleCancelWithWarning = () => {
    if (isDirty && items.length > 0) {
      if (!window.confirm("You have unsaved prescription changes. Are you sure you want to discard them?")) {
        return;
      }
    }
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/patients/${patient.patientId}`);
    }
  };

  // Handle medicine selection from MedEx autocomplete
  // Note: Catalogue provides pharmaceutical reference only.
  // Clinician explicitly enters or selects dosage, frequency, and duration.
  const handleSelectCatalogueMedicine = (med: Medicine) => {
    const newItem: CreatePrescriptionItemDTO = {
      medicineId: med.id,
      brandName: med.brandName,
      genericName: med.genericName,
      strength: med.strength || "",
      dosageForm: med.dosageForm || "Tablet",
      manufacturer: med.manufacturer || "",
      dose: "",
      frequency: "",
      route: med.dosageForm?.toLowerCase().includes("drop")
        ? "Eye Drop"
        : med.dosageForm?.toLowerCase().includes("cream") ||
          med.dosageForm?.toLowerCase().includes("ointment")
        ? "Topical"
        : "Oral",
      duration: "",
      timingInstructions: "After meal",
      specialInstructions: "",
      orderIndex: items.length,
    };

    setItems((prev) => [...prev, newItem]);
    setErrorMessage(null);
  };

  // Add custom uncatalogued medicine
  const handleAddManualMedicine = () => {
    if (!manualBrand.trim() || !manualGeneric.trim()) {
      setErrorMessage("Both Brand Name and Generic Name are required.");
      return;
    }

    const newItem: CreatePrescriptionItemDTO = {
      brandName: manualBrand.trim(),
      genericName: manualGeneric.trim(),
      strength: manualStrength.trim() || undefined,
      dosageForm: manualForm.trim() || "Tablet",
      dose: "",
      frequency: "",
      route: "Oral",
      duration: "",
      timingInstructions: "After meal",
      orderIndex: items.length,
    };

    setItems((prev) => [...prev, newItem]);
    setManualBrand("");
    setManualGeneric("");
    setManualStrength("");
    setManualMode(false);
    setErrorMessage(null);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof CreatePrescriptionItemDTO,
    value: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((it, idx) => ({ ...it, orderIndex: idx }));
    });
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((it, idx) => ({ ...it, orderIndex: idx }));
    });
  };

  const handleAddAdviceChip = (chip: string) => {
    setAdvice((prev) => (prev ? `${prev.trim()}\n• ${chip}` : `• ${chip}`));
  };

  // Save draft or finalize
  const handleSave = async (status: "draft" | "finalized") => {
    if (items.length === 0) {
      setErrorMessage("Please prescribe at least one medication before saving.");
      return;
    }

    // Validate that all items have frequency entered
    for (let i = 0; i < items.length; i++) {
      if (!items[i].frequency || items[i].frequency.trim() === "") {
        setErrorMessage(
          `Please provide dosage frequency (e.g. 1+0+1) for "${items[i].brandName}".`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const repo = getPrescriptionRepository();

      let savedPrescription: Prescription;

      if (existingPrescription?.id) {
        // Update existing draft
        savedPrescription = await repo.updatePrescription(existingPrescription.id, {
          prescriptionDate,
          advice: advice.trim() || undefined,
          followUpDate: followUpDate || undefined,
          followUpInstructions: followUpInstructions.trim() || undefined,
          notes: notes.trim() || undefined,
          items,
        });

        if (status === "finalized") {
          savedPrescription = await repo.finalizePrescription(existingPrescription.id);
        }
      } else {
        // Create new prescription
        savedPrescription = await repo.createPrescription({
          patientId: patient.id,
          consultationId: consultation?.id,
          prescriptionDate,
          status,
          advice: advice.trim() || undefined,
          followUpDate: followUpDate || undefined,
          followUpInstructions: followUpInstructions.trim() || undefined,
          notes: notes.trim() || undefined,
          items,
        });
      }

      setIsDirty(false);
      setShowFinalizeModal(false);

      if (onSuccess) {
        onSuccess(savedPrescription);
      } else {
        router.push(
          `/patients/${patient.patientId}/prescriptions/${savedPrescription.id}`
        );
      }
    } catch (err: unknown) {
      console.error("Prescription save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save prescription.";
      setErrorMessage(msg);
      setShowFinalizeModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EAE3D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#201C1A]">
              {existingPrescription ? "Edit Prescription Draft" : "New Prescription"}
            </h1>
            <Badge variant="neutral" className="text-xs border-[#C4BCB3]">
              {existingPrescription?.prescriptionCode || "New Rx"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#7A746F] mt-1">
            Patient: <strong className="text-[#201C1A]">{patient.name}</strong> ({patient.patientId}, {patient.gender}, {patient.age}y)
            {consultation && ` • Linked to Visit of ${consultation.consultationDate}`}
          </p>
        </div>

        {/* Prescription Date selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-semibold text-[#7A746F] flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Date:</span>
          </label>
          <input
            type="date"
            value={prescriptionDate}
            onChange={(e) => setPrescriptionDate(e.target.value)}
            className="rounded-lg border border-[#EAE3D9] bg-white px-2.5 py-1 text-xs text-[#201C1A] focus:border-[#DE4F3C] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Clinical Safety Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 text-xs text-amber-900">
        <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
        <div>
          <strong className="font-semibold text-amber-950">Clinician Control & Verification:</strong> All doses, frequencies, routes, and instructions are solely determined and confirmed by the attending doctor. Catalogue data serves strictly as pharmaceutical nomenclature reference.
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: MEDICINE SEARCH & ADD */}
      <div className="rounded-2xl border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
              <Pill className="h-4 w-4" />
            </div>
            <h2 className="font-serif text-base font-bold text-[#201C1A]">
              Add Prescribed Medication
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setManualMode(!manualMode)}
            className="text-xs text-[#DE4F3C] hover:underline font-medium cursor-pointer"
          >
            {manualMode ? "Switch to Catalogue Search" : "+ Add Custom Medicine"}
          </button>
        </div>

        {/* Search Mode */}
        {!manualMode ? (
          <div>
            <MedicineSearchAutocomplete
              onSelect={handleSelectCatalogueMedicine}
              placeholder="Search 1,200+ medicines by Brand (e.g. Napa, Seclo) or Generic..."
              showClinicalNotice={false}
              limit={15}
            />
            <p className="text-[11px] text-[#7A746F] mt-1.5">
              Type at least 2 characters to trigger fast fuzzy search across live Bangladesh MedEx catalogue.
            </p>
          </div>
        ) : (
          /* Manual Custom Entry Mode */
          <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-4 space-y-3">
            <div className="text-xs font-semibold text-[#201C1A]">
              Manual / Custom Medicine Entry
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#7A746F]">Brand Name *</label>
                <Input
                  value={manualBrand}
                  onChange={(e) => setManualBrand(e.target.value)}
                  placeholder="e.g. Napa"
                  className="mt-1 h-8 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#7A746F]">Generic Name *</label>
                <Input
                  value={manualGeneric}
                  onChange={(e) => setManualGeneric(e.target.value)}
                  placeholder="e.g. Paracetamol"
                  className="mt-1 h-8 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#7A746F]">Strength</label>
                <Input
                  value={manualStrength}
                  onChange={(e) => setManualStrength(e.target.value)}
                  placeholder="e.g. 500 mg"
                  className="mt-1 h-8 text-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#7A746F]">Dosage Form</label>
                <select
                  value={manualForm}
                  onChange={(e) => setManualForm(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#EAE3D9] bg-white px-2 py-1.5 text-xs text-[#201C1A]"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Injection">Injection</option>
                  <option value="Eye Drop">Eye Drop</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Suppository">Suppository</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualMode(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddManualMedicine}
                className="h-7 text-xs"
              >
                Add to Prescription
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PRESCRIBED MEDICINES LIST (REORDERABLE & EDITABLE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-[#201C1A]">
          <span>Medications List ({items.length})</span>
          <span className="text-[11px] text-[#7A746F]">
            Verify frequency (e.g. 1+0+1), route, and duration for each item
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EAE3D9] bg-white p-8 text-center text-[#7A746F]">
            <Pill className="mx-auto h-8 w-8 text-[#C4BCB3] mb-2" />
            <p className="text-xs font-medium text-[#201C1A]">No medications added yet</p>
            <p className="text-[11px] mt-0.5">
              Use the search bar above to select medications from the catalogue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[#EAE3D9] bg-white p-4 shadow-2xs space-y-3 transition-all hover:border-[#C4BCB3]"
              >
                {/* Header row: Number, Brand, Generic, badges, Reorder, Remove */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE3D9]/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#201C1A] text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-serif text-sm font-bold text-[#201C1A]">
                      {item.brandName}
                    </span>
                    {item.strength && (
                      <span className="rounded-full bg-[#EAE3D9] px-2 py-0.5 text-[10px] font-semibold text-[#201C1A]">
                        {item.strength}
                      </span>
                    )}
                    {item.dosageForm && (
                      <span className="rounded-md border border-[#EAE3D9] bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
                        {item.dosageForm}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      onClick={() => handleMoveItem(index, "up")}
                      disabled={index === 0}
                      className="p-1 text-[#7A746F] hover:text-[#201C1A] disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveItem(index, "down")}
                      disabled={index === items.length - 1}
                      className="p-1 text-[#7A746F] hover:text-[#201C1A] disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer ml-1"
                      title="Remove Medication"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subheader: Generic & Manufacturer */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#7A746F] -mt-1">
                  <span>
                    Generic: <strong className="font-medium text-[#504A45]">{item.genericName}</strong>
                  </span>
                  {item.manufacturer && (
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <Building2 className="h-3 w-3" />
                      <span>{item.manufacturer}</span>
                    </span>
                  )}
                </div>

                {/* Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  {/* Frequency (e.g. 1+0+1) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#201C1A]">
                      Frequency / Regimen *
                    </label>
                    <Input
                      value={item.frequency}
                      onChange={(e) => handleUpdateItem(index, "frequency", e.target.value)}
                      placeholder="e.g. 1+0+1, 1+1+1"
                      className="h-8 text-xs font-mono font-bold"
                    />
                    {/* Quick Frequency Suggestions */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {COMMON_FREQUENCIES.slice(0, 4).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => handleUpdateItem(index, "frequency", freq)}
                          className="rounded bg-[#FAF8F5] border border-[#EAE3D9] px-1 py-0.2 text-[9px] font-medium text-[#504A45] hover:bg-[#EAE3D9] cursor-pointer"
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dose (e.g. 1 tablet, 5 ml) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#201C1A]">
                      Dose / Quantity
                    </label>
                    <Input
                      value={item.dose || ""}
                      onChange={(e) => handleUpdateItem(index, "dose", e.target.value)}
                      placeholder="e.g. 1 tablet, 10 ml"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Route */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#201C1A]">
                      Route
                    </label>
                    <select
                      value={item.route || "Oral"}
                      onChange={(e) => handleUpdateItem(index, "route", e.target.value)}
                      className="h-8 w-full rounded-md border border-[#EAE3D9] bg-white px-2 text-xs text-[#201C1A] shadow-2xs focus:border-[#DE4F3C]"
                    >
                      {COMMON_ROUTES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#201C1A]">
                      Duration
                    </label>
                    <Input
                      value={item.duration || ""}
                      onChange={(e) => handleUpdateItem(index, "duration", e.target.value)}
                      placeholder="e.g. 7 days, 1 month"
                      className="h-8 text-xs"
                    />
                    {/* Quick Duration Suggestions */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {["3 days", "5 days", "7 days", "14 days"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleUpdateItem(index, "duration", d)}
                          className="rounded bg-[#FAF8F5] border border-[#EAE3D9] px-1 py-0.2 text-[9px] font-medium text-[#504A45] hover:bg-[#EAE3D9] cursor-pointer"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Second row: Timing & Special instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#EAE3D9]/40">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#7A746F]">
                      Timing Instructions
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={item.timingInstructions || ""}
                        onChange={(e) =>
                          handleUpdateItem(index, "timingInstructions", e.target.value)
                        }
                        placeholder="e.g. After meal, Before meal"
                        className="h-7 text-xs"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleUpdateItem(index, "timingInstructions", e.target.value);
                          }
                        }}
                        className="h-7 rounded border border-[#EAE3D9] bg-white px-1 text-[11px] text-[#7A746F]"
                      >
                        <option value="">Preset</option>
                        {COMMON_TIMINGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-[#7A746F]">
                      Special Instructions / Warnings
                    </label>
                    <Input
                      value={item.specialInstructions || ""}
                      onChange={(e) =>
                        handleUpdateItem(index, "specialInstructions", e.target.value)
                      }
                      placeholder="e.g. Do not stop abruptly"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: CLINICAL ADVICE & FOLLOW-UP */}
      <div className="rounded-2xl border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="font-serif text-base font-bold text-[#201C1A]">
            Advice, Follow-up & Clinical Notes
          </h2>
        </div>

        {/* Advice Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#201C1A]">
              Clinical Advice & Lifestyle Instructions
            </label>
            <span className="text-[11px] text-[#7A746F]">
              Printed on prescription
            </span>
          </div>
          <Textarea
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            rows={3}
            placeholder="e.g. Take plenty of fluids. Avoid oily and spicy foods. Complete full course of antibiotics."
            className="text-xs"
          />

          {/* Quick Advice Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-medium text-[#7A746F] self-center mr-1">
              Quick insert:
            </span>
            {QUICK_ADVICE_CHIPS.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAddAdviceChip(chip)}
                className="rounded-full border border-[#EAE3D9] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-medium text-[#504A45] hover:bg-[#EAE3D9] hover:text-[#201C1A] cursor-pointer transition-colors"
              >
                + {chip.slice(0, 32)}...
              </button>
            ))}
          </div>
        </div>

        {/* Follow-up Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE3D9]/60">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Next Follow-up Date</span>
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-md border border-[#EAE3D9] bg-white px-2.5 py-1.5 text-xs text-[#201C1A] focus:border-[#DE4F3C]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#201C1A]">
              Follow-up Review Instructions
            </label>
            <Input
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              placeholder="e.g. Review with CBC report, or if fever persists"
              className="h-8.5 text-xs"
            />
          </div>
        </div>

        {/* Clinician Internal Notes (Not Printed) */}
        <div className="space-y-1 pt-2 border-t border-[#EAE3D9]/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#201C1A]">
              Internal Clinician Notes
            </label>
            <span className="text-[10px] text-[#7A746F]">Internal record only</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Clinical rationale, differential considerations, or notes for next consultation..."
            className="text-xs"
          />
        </div>
      </div>

      {/* ACTION BAR (SAVE DRAFT / FINALIZE / CANCEL) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#EAE3D9] bg-[#FAF8F5] p-4 shadow-sm">
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelWithWarning}
            disabled={isSubmitting}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel / Back</span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Save Draft Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={isSubmitting}
            className="text-xs gap-1.5 border-[#C4BCB3] hover:border-[#201C1A]"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Draft</span>
          </Button>

          {/* Finalize Button (Triggers Confirmation Modal) */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowFinalizeModal(true)}
            disabled={isSubmitting || items.length === 0}
            className="text-xs gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Finalize Prescription</span>
          </Button>
        </div>
      </div>

      {/* FINALIZATION CONFIRMATION MODAL */}
      <Modal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
      >
        <ModalHeader>
          <ModalTitle>Confirm Prescription Finalization</ModalTitle>
          <ModalDescription>
            Please confirm you are ready to officially lock and issue this prescription.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Medico-Legal Record Lock:</p>
              <p className="mt-1">
                Finalizing will officially lock this prescription. Once locked, medicines, dosages, and clinical advice cannot be silently edited.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-[#7A746F]">
              <span>Patient:</span>
              <strong className="text-[#201C1A]">{patient.name} ({patient.patientId})</strong>
            </div>
            <div className="flex justify-between text-[#7A746F]">
              <span>Prescribed Items:</span>
              <strong className="text-[#201C1A]">{items.length} medications</strong>
            </div>
            <div className="flex justify-between text-[#7A746F]">
              <span>Prescription Date:</span>
              <strong className="text-[#201C1A]">{prescriptionDate}</strong>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFinalizeModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave("finalized")}
            disabled={isSubmitting}
            className="gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Yes, Finalize & Lock</span>
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
