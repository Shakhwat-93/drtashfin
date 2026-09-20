"use client";

import * as React from "react";
import { Check, Loader2, Calendar, FileText } from "lucide-react";
import { Patient } from "@/types/patient";
import {
  Consultation,
  CreateConsultationDTO,
  UpdateConsultationDTO,
  ConsanguinityOption,
} from "@/types/consultation";
import {
  createConsultationSchema,
  updateConsultationSchema,
} from "@/schemas/consultation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConsultationFormProps {
  mode: "create" | "edit";
  patient: Patient;
  initialData?: Consultation;
  isSubmitting?: boolean;
  onSubmit: (
    data: CreateConsultationDTO | UpdateConsultationDTO
  ) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

const DRAFT_KEY_PREFIX = "pms_draft_consultation_";

export function ConsultationForm({
  mode,
  patient,
  initialData,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: ConsultationFormProps) {
  const draftStorageKey = `${DRAFT_KEY_PREFIX}${patient.patientId}`;

  // Form Fields State
  const [consultationDate, setConsultationDate] = React.useState<string>(
    initialData?.consultationDate || new Date().toISOString().split("T")[0]
  );
  const [chiefComplaint, setChiefComplaint] = React.useState<string>(
    initialData?.chiefComplaint || ""
  );
  const [birthHistory, setBirthHistory] = React.useState<string>(
    initialData?.birthHistory || ""
  );
  const [familyHistory, setFamilyHistory] = React.useState<string>(
    initialData?.familyHistory || ""
  );
  const [consanguinity, setConsanguinity] = React.useState<
    ConsanguinityOption | undefined
  >(initialData?.consanguinity);
  const [drugHistory, setDrugHistory] = React.useState<string>(
    initialData?.drugHistory || ""
  );
  const [others, setOthers] = React.useState<string>(
    initialData?.others || ""
  );
  const [clinicalExamination, setClinicalExamination] = React.useState<string>(
    initialData?.clinicalExamination || ""
  );
  const [investigationAdvised, setInvestigationAdvised] = React.useState<string>(
    initialData?.investigationAdvised || ""
  );
  const [currentInvestigation, setCurrentInvestigation] = React.useState<string>(
    initialData?.currentInvestigation || ""
  );
  const [provisionalDiagnosis, setProvisionalDiagnosis] = React.useState<string>(
    initialData?.provisionalDiagnosis || ""
  );
  const [differentialDiagnosis, setDifferentialDiagnosis] =
    React.useState<string>(initialData?.differentialDiagnosis || "");
  const [plan, setPlan] = React.useState<string>(initialData?.plan || "");
  const [advice, setAdvice] = React.useState<string>(
    initialData?.advice || ""
  );
  const [nextFollowUp, setNextFollowUp] = React.useState<string>(
    initialData?.nextFollowUp || ""
  );

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = React.useState(false);

  // Load development draft in create mode
  React.useEffect(() => {
    if (mode !== "create") return;
    const timer = setTimeout(() => {
      try {
        const savedDraft = localStorage.getItem(draftStorageKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.consultationDate) setConsultationDate(parsed.consultationDate);
          if (parsed.chiefComplaint) setChiefComplaint(parsed.chiefComplaint);
          if (parsed.birthHistory) setBirthHistory(parsed.birthHistory);
          if (parsed.familyHistory) setFamilyHistory(parsed.familyHistory);
          if (parsed.consanguinity) setConsanguinity(parsed.consanguinity);
          if (parsed.drugHistory) setDrugHistory(parsed.drugHistory);
          if (parsed.others) setOthers(parsed.others);
          if (parsed.clinicalExamination)
            setClinicalExamination(parsed.clinicalExamination);
          if (parsed.investigationAdvised)
            setInvestigationAdvised(parsed.investigationAdvised);
          if (parsed.currentInvestigation)
            setCurrentInvestigation(parsed.currentInvestigation);
          if (parsed.provisionalDiagnosis)
            setProvisionalDiagnosis(parsed.provisionalDiagnosis);
          if (parsed.differentialDiagnosis)
            setDifferentialDiagnosis(parsed.differentialDiagnosis);
          if (parsed.plan) setPlan(parsed.plan);
          if (parsed.advice) setAdvice(parsed.advice);
          if (parsed.nextFollowUp) setNextFollowUp(parsed.nextFollowUp);
          setHasRestoredDraft(true);
        }
      } catch {
        // Ignore storage errors in dev
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [mode, draftStorageKey]);

  // Save development draft periodically on change
  React.useEffect(() => {
    if (mode !== "create") return;
    if (!hasUnsavedChanges) return;

    const draftData = {
      consultationDate,
      chiefComplaint,
      birthHistory,
      familyHistory,
      consanguinity,
      drugHistory,
      others,
      clinicalExamination,
      investigationAdvised,
      currentInvestigation,
      provisionalDiagnosis,
      differentialDiagnosis,
      plan,
      advice,
      nextFollowUp,
    };

    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
    } catch {
      // Ignore storage errors
    }
  }, [
    mode,
    hasUnsavedChanges,
    draftStorageKey,
    consultationDate,
    chiefComplaint,
    birthHistory,
    familyHistory,
    consanguinity,
    drugHistory,
    others,
    clinicalExamination,
    investigationAdvised,
    currentInvestigation,
    provisionalDiagnosis,
    differentialDiagnosis,
    plan,
    advice,
    nextFollowUp,
  ]);

  // Warn before browser unload if unsaved changes exist
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
      setHasRestoredDraft(false);
      setChiefComplaint("");
      setBirthHistory("");
      setFamilyHistory("");
      setConsanguinity(undefined);
      setDrugHistory("");
      setOthers("");
      setClinicalExamination("");
      setInvestigationAdvised("");
      setCurrentInvestigation("");
      setProvisionalDiagnosis("");
      setDifferentialDiagnosis("");
      setPlan("");
      setAdvice("");
      setNextFollowUp("");
      setHasUnsavedChanges(false);
    } catch {
      // Ignore
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved clinical entries. Are you sure you want to discard them?"
      );
      if (!confirmLeave) return;
    }
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore
    }
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const rawData = {
      patientId: patient.patientId,
      consultationDate,
      chiefComplaint: chiefComplaint.trim() || undefined,
      birthHistory: birthHistory.trim() || undefined,
      familyHistory: familyHistory.trim() || undefined,
      consanguinity: consanguinity || undefined,
      drugHistory: drugHistory.trim() || undefined,
      others: others.trim() || undefined,
      clinicalExamination: clinicalExamination.trim() || undefined,
      investigationAdvised: investigationAdvised.trim() || undefined,
      currentInvestigation: currentInvestigation.trim() || undefined,
      provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
      differentialDiagnosis: differentialDiagnosis.trim() || undefined,
      plan: plan.trim() || undefined,
      advice: advice.trim() || undefined,
      nextFollowUp: nextFollowUp.trim() || undefined,
    };

    const schema =
      mode === "create" ? createConsultationSchema : updateConsultationSchema;
    const validation = schema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const issues =
        validation.error.issues ||
        (validation.error as unknown as {
          errors?: Array<{ path: Array<string | number>; message: string }>;
        }).errors ||
        [];

      issues.forEach((err) => {
        const field = String(err.path[0]);
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(validation.data as CreateConsultationDTO);
      // Clean up development draft upon success
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : "Failed to save consultation record.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-8", className)} noValidate>
      {/* 1. Compact Patient Identity Header */}
      <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF5EE] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAE3D9] text-[#DE4F3C] font-semibold text-sm">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#201C1A]">
                  {patient.name}
                </span>
                <Badge
                  variant="neutral"
                  size="sm"
                  className="font-mono font-semibold"
                >
                  {patient.patientId}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A746F] mt-0.5">
                <span>{patient.age} yrs</span>
                <span>•</span>
                <span className="capitalize">{patient.gender}</span>
                {patient.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-[#DE4F3C]">
                      {patient.bloodGroup}
                    </span>
                  </>
                )}
                {patient.weight && (
                  <>
                    <span>•</span>
                    <span>{patient.weight} kg</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Draft Restored Banner */}
          {hasRestoredDraft && (
            <div className="flex items-center gap-2 bg-amber-100/70 border border-amber-300/80 rounded-lg px-2.5 py-1 text-xs text-amber-900">
              <span>Restored from local draft</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="underline text-[11px] font-semibold text-amber-950 hover:text-amber-800 cursor-pointer"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Error Alert */}
      {errors.form && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {errors.form}
        </div>
      )}

      {/* SECTION 1: CONSULTATION */}
      <section className="space-y-4 border-b border-[#EAE3D9] pb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#DE4F3C]" />
          <h3 className="font-serif text-base font-semibold text-[#201C1A]">
            Consultation
          </h3>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Consultation Date <span className="text-[#DE4F3C]">*</span>
          </label>
          <input
            type="date"
            value={consultationDate}
            onChange={(e) => {
              setConsultationDate(e.target.value);
              markDirty();
            }}
            className={cn(
              "w-full rounded-lg border bg-white px-3.5 py-2 text-xs text-[#201C1A] transition-all focus:outline-hidden focus:ring-2",
              errors.consultationDate
                ? "border-rose-400 focus:ring-rose-200"
                : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
            )}
            required
          />
          {errors.consultationDate && (
            <p className="mt-1 text-[11px] text-rose-600 font-medium">
              {errors.consultationDate}
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2: HISTORY */}
      <section className="space-y-5 border-b border-[#EAE3D9] pb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#DE4F3C]" />
          <h3 className="font-serif text-base font-semibold text-[#201C1A]">
            History
          </h3>
        </div>

        <div className="space-y-4">
          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Chief Complaint
            </label>
            <textarea
              rows={3}
              value={chiefComplaint}
              onChange={(e) => {
                setChiefComplaint(e.target.value);
                markDirty();
              }}
              placeholder="Presenting symptoms, duration, and onset..."
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Birth History */}
            <div>
              <label className="block text-xs font-semibold text-[#201C1A] mb-1">
                Birth History
              </label>
              <textarea
                rows={2}
                value={birthHistory}
                onChange={(e) => {
                  setBirthHistory(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[64px]"
              />
            </div>

            {/* Family History */}
            <div>
              <label className="block text-xs font-semibold text-[#201C1A] mb-1">
                Family History
              </label>
              <textarea
                rows={2}
                value={familyHistory}
                onChange={(e) => {
                  setFamilyHistory(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[64px]"
              />
            </div>
          </div>

          {/* Consanguinity */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1.5">
              Consanguinity
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConsanguinity("yes");
                  markDirty();
                }}
                className={cn(
                  "rounded-lg border px-4 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  consanguinity === "yes"
                    ? "border-[#DE4F3C] bg-[#FDF0EE] text-[#DE4F3C] font-semibold"
                    : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                )}
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() => {
                  setConsanguinity("no");
                  markDirty();
                }}
                className={cn(
                  "rounded-lg border px-4 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  consanguinity === "no"
                    ? "border-[#DE4F3C] bg-[#FDF0EE] text-[#DE4F3C] font-semibold"
                    : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                )}
              >
                No
              </button>

              {consanguinity !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setConsanguinity(undefined);
                    markDirty();
                  }}
                  className="text-xs text-[#7A746F] hover:text-[#201C1A] underline ml-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drug History */}
            <div>
              <label className="block text-xs font-semibold text-[#201C1A] mb-1">
                Drug History
              </label>
              <textarea
                rows={2}
                value={drugHistory}
                onChange={(e) => {
                  setDrugHistory(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[64px]"
              />
            </div>

            {/* Others */}
            <div>
              <label className="block text-xs font-semibold text-[#201C1A] mb-1">
                Others
              </label>
              <textarea
                rows={2}
                value={others}
                onChange={(e) => {
                  setOthers(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[64px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CLINICAL EXAMINATION */}
      <section className="space-y-4 border-b border-[#EAE3D9] pb-6">
        <h3 className="font-serif text-base font-semibold text-[#201C1A]">
          Clinical Examination
        </h3>
        <div>
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Examination Findings
          </label>
          <textarea
            rows={4}
            value={clinicalExamination}
            onChange={(e) => {
              setClinicalExamination(e.target.value);
              markDirty();
            }}
            placeholder="Vitals, systemic examination, local inspection findings..."
            className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[96px]"
          />
        </div>
      </section>

      {/* SECTION 4: INVESTIGATIONS */}
      <section className="space-y-4 border-b border-[#EAE3D9] pb-6">
        <h3 className="font-serif text-base font-semibold text-[#201C1A]">
          Investigations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Investigation Advised
            </label>
            <textarea
              rows={3}
              value={investigationAdvised}
              onChange={(e) => {
                setInvestigationAdvised(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Current Investigation
            </label>
            <textarea
              rows={3}
              value={currentInvestigation}
              onChange={(e) => {
                setCurrentInvestigation(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: DIAGNOSIS */}
      <section className="space-y-4 border-b border-[#EAE3D9] pb-6">
        <h3 className="font-serif text-base font-semibold text-[#201C1A]">
          Diagnosis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Provisional Diagnosis
            </label>
            <textarea
              rows={3}
              value={provisionalDiagnosis}
              onChange={(e) => {
                setProvisionalDiagnosis(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Differential Diagnosis
            </label>
            <textarea
              rows={3}
              value={differentialDiagnosis}
              onChange={(e) => {
                setDifferentialDiagnosis(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: MANAGEMENT */}
      <section className="space-y-4 border-b border-[#EAE3D9] pb-6">
        <h3 className="font-serif text-base font-semibold text-[#201C1A]">
          Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Plan
            </label>
            <textarea
              rows={3}
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Advice
            </label>
            <textarea
              rows={3}
              value={advice}
              onChange={(e) => {
                setAdvice(e.target.value);
                markDirty();
              }}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 min-h-[72px]"
            />
          </div>
        </div>

        {/* Next Follow-up Date */}
        <div className="max-w-xs pt-1">
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Next Follow-up
          </label>
          <input
            type="date"
            value={nextFollowUp}
            onChange={(e) => {
              setNextFollowUp(e.target.value);
              markDirty();
            }}
            className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
          />
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Record...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>
                {mode === "create" ? "Save Consultation" : "Save Changes"}
              </span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
