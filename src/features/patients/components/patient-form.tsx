"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Loader2,
  User,
  Phone,
  Activity,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { Patient, CreatePatientDTO, UpdatePatientDTO } from "@/types/patient";
import { Gender, BloodGroup } from "@/types/common";
import { createPatientSchema, updatePatientSchema } from "@/schemas/patient";
import { getPatientRepository } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PatientFormProps {
  mode: "create" | "edit";
  initialData?: Patient;
  nextPatientId?: string;
  isSubmitting?: boolean;
  onSubmit: (data: CreatePatientDTO | UpdatePatientDTO) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

const COMMON_ALLERGIES = [
  "No Known Drug Allergies",
  "Penicillin",
  "Sulfa drugs",
  "NSAIDs / Aspirin",
  "Cephalosporins",
  "Paracetamol",
  "Dust / Pollen",
  "Seafood",
  "Contrast Media",
];

const COMMON_CONDITIONS = [
  "Hypertension (HTN)",
  "Diabetes Mellitus (DM)",
  "Ischemic Heart Disease (IHD)",
  "Bronchial Asthma / COPD",
  "Chronic Kidney Disease (CKD)",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Stroke / TIA",
  "Hepatitis / Liver Disease",
  "Dyslipidemia",
];

export function PatientForm({
  mode,
  initialData,
  nextPatientId,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: PatientFormProps) {
  // Section A: Patient Identity & Family
  const [name, setName] = React.useState(initialData?.name || "");
  const [dateOfBirth, setDateOfBirth] = React.useState(
    initialData?.dateOfBirth || ""
  );
  const [age, setAge] = React.useState<string>(
    initialData?.age !== undefined ? String(initialData.age) : ""
  );
  const [gender, setGender] = React.useState<Gender>(
    initialData?.gender || "male"
  );
  const [weight, setWeight] = React.useState<string>(
    initialData?.weight !== undefined ? String(initialData.weight) : ""
  );
  const [fatherName, setFatherName] = React.useState(
    initialData?.fatherName || ""
  );
  const [motherName, setMotherName] = React.useState(
    initialData?.motherName || ""
  );
  const [guardianName, setGuardianName] = React.useState(
    initialData?.guardianName || ""
  );
  const [guardianRelationship, setGuardianRelationship] = React.useState(
    initialData?.guardianRelationship || ""
  );

  // Section B: Contact & Emergency Information
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [secondaryPhone, setSecondaryPhone] = React.useState(
    initialData?.secondaryPhone || ""
  );
  const [smsConsentStatus, setSmsConsentStatus] = React.useState<
    "opted_in" | "opted_out" | "unknown"
  >(initialData?.smsConsentStatus || "unknown");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [address, setAddress] = React.useState(initialData?.address || "");
  const [permanentAddress, setPermanentAddress] = React.useState(
    initialData?.permanentAddress || ""
  );
  const [sameAsPresentAddress, setSameAsPresentAddress] = React.useState(
    initialData
      ? Boolean(
          initialData.address &&
            initialData.permanentAddress &&
            initialData.address.trim() === initialData.permanentAddress.trim()
        )
      : false
  );

  const [emergencyContactName, setEmergencyContactName] = React.useState(
    initialData?.emergencyContactName || ""
  );
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    React.useState(initialData?.emergencyContactRelationship || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState(
    initialData?.emergencyContactPhone || ""
  );

  // Section C: Additional Clinical & Social Information
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup | "">(
    initialData?.bloodGroup || ""
  );
  const [occupation, setOccupation] = React.useState(
    initialData?.occupation || ""
  );
  const [allergies, setAllergies] = React.useState(
    initialData?.allergies || ""
  );
  const [medicalHistory, setMedicalHistory] = React.useState(
    initialData?.medicalHistory || ""
  );
  const [currentMedications, setCurrentMedications] = React.useState(
    initialData?.currentMedications || ""
  );
  const [patientNotes, setPatientNotes] = React.useState(
    initialData?.patientNotes || ""
  );

  // Validation & Duplicate State
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<Patient | null>(
    null
  );

  // Track if user made edits (dirty check)
  const isDirty = React.useMemo(() => {
    if (mode === "create") {
      return (
        name.trim() !== "" ||
        phone.trim() !== "" ||
        dateOfBirth !== "" ||
        address.trim() !== "" ||
        allergies.trim() !== ""
      );
    }
    return (
      name !== (initialData?.name || "") ||
      dateOfBirth !== (initialData?.dateOfBirth || "") ||
      age !== (initialData?.age !== undefined ? String(initialData.age) : "") ||
      gender !== (initialData?.gender || "male") ||
      phone !== (initialData?.phone || "") ||
      secondaryPhone !== (initialData?.secondaryPhone || "") ||
      email !== (initialData?.email || "") ||
      address !== (initialData?.address || "") ||
      permanentAddress !== (initialData?.permanentAddress || "") ||
      fatherName !== (initialData?.fatherName || "") ||
      motherName !== (initialData?.motherName || "") ||
      guardianName !== (initialData?.guardianName || "") ||
      guardianRelationship !== (initialData?.guardianRelationship || "") ||
      emergencyContactName !== (initialData?.emergencyContactName || "") ||
      emergencyContactPhone !== (initialData?.emergencyContactPhone || "") ||
      bloodGroup !== (initialData?.bloodGroup || "") ||
      occupation !== (initialData?.occupation || "") ||
      allergies !== (initialData?.allergies || "") ||
      medicalHistory !== (initialData?.medicalHistory || "") ||
      currentMedications !== (initialData?.currentMedications || "") ||
      patientNotes !== (initialData?.patientNotes || "") ||
      smsConsentStatus !== (initialData?.smsConsentStatus || "unknown")
    );
  }, [
    mode,
    name,
    phone,
    secondaryPhone,
    smsConsentStatus,
    dateOfBirth,
    age,
    gender,
    email,
    address,
    permanentAddress,
    fatherName,
    motherName,
    guardianName,
    guardianRelationship,
    emergencyContactName,
    emergencyContactPhone,
    bloodGroup,
    occupation,
    allergies,
    medicalHistory,
    currentMedications,
    patientNotes,
    initialData,
  ]);

  // Window unsaved changes alert
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Sync permanent address with present address when checkbox is toggled
  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsPresentAddress(checked);
    if (checked) {
      setPermanentAddress(address);
    }
  };

  // Keep permanent address in sync if checkbox is checked and address changes
  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (sameAsPresentAddress) {
      setPermanentAddress(val);
    }
  };

  // Auto-calculate Age when Date of Birth changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setDateOfBirth(dob);

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      if (!isNaN(birthDate.getTime()) && birthDate <= today) {
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        setAge(String(Math.max(0, calculatedAge)));
      }
    }
  };

  // Quick pill selection helpers
  const handleAddAllergyPill = (item: string) => {
    if (item === "No Known Drug Allergies") {
      setAllergies("No Known Drug Allergies (NKDA)");
      return;
    }

    const currentList = allergies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (currentList.includes(item)) {
      // Toggle off
      const nextList = currentList.filter((s) => s !== item);
      setAllergies(nextList.join(", "));
    } else {
      // Toggle on (remove 'No Known' if present)
      const cleaned = currentList.filter(
        (s) => !s.toLowerCase().includes("no known")
      );
      setAllergies([...cleaned, item].join(", "));
    }
  };

  const handleAddConditionPill = (item: string) => {
    const currentList = medicalHistory
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (currentList.includes(item)) {
      // Toggle off
      const nextList = currentList.filter((s) => s !== item);
      setMedicalHistory(nextList.join(", "));
    } else {
      setMedicalHistory([...currentList, item].join(", "));
    }
  };

  // Duplicate patient checking in create mode (Name or Phone or Secondary Phone)
  React.useEffect(() => {
    if (mode !== "create") return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      const cleanName = name.trim();
      const cleanPhone = phone.trim() || secondaryPhone.trim();

      if (cleanName.length < 3 && cleanPhone.length < 7) {
        if (!isCancelled) {
          setDuplicateWarning(null);
        }
        return;
      }

      try {
        const repo = getPatientRepository();
        const found = await repo.checkPotentialDuplicate(cleanName, cleanPhone);
        if (!isCancelled) {
          setDuplicateWarning(found);
        }
      } catch {
        if (!isCancelled) {
          setDuplicateWarning(null);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [mode, name, phone, secondaryPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const rawData = {
      name: name.trim(),
      dateOfBirth,
      gender,
      age: age !== "" ? parseInt(age, 10) : undefined,
      weight: weight !== "" ? parseFloat(weight) : undefined,
      phone: phone.trim() !== "" ? phone.trim() : undefined,
      secondaryPhone:
        secondaryPhone.trim() !== "" ? secondaryPhone.trim() : undefined,
      smsConsentStatus,
      smsConsentAt:
        smsConsentStatus !== (initialData?.smsConsentStatus || "unknown")
          ? new Date().toISOString()
          : initialData?.smsConsentAt,
      smsConsentSource:
        smsConsentStatus !== (initialData?.smsConsentStatus || "unknown")
          ? (mode === "create" ? "registration" : "in_person")
          : initialData?.smsConsentSource,
      email: email.trim() !== "" ? email.trim() : undefined,
      address: address.trim() !== "" ? address.trim() : undefined,
      permanentAddress:
        sameAsPresentAddress && address.trim() !== ""
          ? address.trim()
          : permanentAddress.trim() !== ""
          ? permanentAddress.trim()
          : undefined,
      bloodGroup: bloodGroup !== "" ? (bloodGroup as BloodGroup) : undefined,

      // Section A
      fatherName: fatherName.trim() !== "" ? fatherName.trim() : undefined,
      motherName: motherName.trim() !== "" ? motherName.trim() : undefined,
      guardianName:
        guardianName.trim() !== "" ? guardianName.trim() : undefined,
      guardianRelationship:
        guardianRelationship.trim() !== ""
          ? guardianRelationship.trim()
          : undefined,

      // Section B
      emergencyContactName:
        emergencyContactName.trim() !== ""
          ? emergencyContactName.trim()
          : undefined,
      emergencyContactRelationship:
        emergencyContactRelationship.trim() !== ""
          ? emergencyContactRelationship.trim()
          : undefined,
      emergencyContactPhone:
        emergencyContactPhone.trim() !== ""
          ? emergencyContactPhone.trim()
          : undefined,

      // Section C
      occupation: occupation.trim() !== "" ? occupation.trim() : undefined,
      allergies: allergies.trim() !== "" ? allergies.trim() : undefined,
      medicalHistory:
        medicalHistory.trim() !== "" ? medicalHistory.trim() : undefined,
      currentMedications:
        currentMedications.trim() !== ""
          ? currentMedications.trim()
          : undefined,
      patientNotes:
        patientNotes.trim() !== "" ? patientNotes.trim() : undefined,
    };

    // Zod validation
    const schema =
      mode === "create" ? createPatientSchema : updatePatientSchema;
    const validation = schema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const issues =
        validation.error.issues ||
        (
          validation.error as unknown as {
            errors?: Array<{
              path: Array<string | number>;
              message: string;
            }>;
          }
        ).errors ||
        [];

      issues.forEach((err) => {
        const field = String(err.path[0]);
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      // Scroll to the first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        const el = document.querySelector(`[name="${firstErrorField}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    try {
      await onSubmit(validation.data as CreatePatientDTO);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Failed to save patient.",
      });
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to discard them?"
      );
      if (!confirmDiscard) return;
    }
    if (onCancel) onCancel();
  };

  const bloodGroupOptions: BloodGroup[] = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-8 max-w-4xl", className)}
      noValidate
    >
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE3D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl font-bold text-[#201C1A]">
              {mode === "create"
                ? "Complete Patient Registration"
                : "Edit Patient Lifetime Profile"}
            </h3>
            {isDirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved Edits
              </span>
            )}
          </div>
          <p className="text-xs text-[#7A746F] mt-0.5">
            {mode === "create"
              ? "Establish a lifetime clinical and demographic patient record."
              : `Updating lifetime clinical record for ${
                  initialData?.name || "Patient"
                }.`}
          </p>
        </div>

        {mode === "create" && nextPatientId && (
          <div className="flex items-center gap-2 bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9]">
            <span className="text-xs text-[#7A746F]">Generated ID:</span>
            <Badge variant="primary" className="font-mono font-bold text-xs">
              {nextPatientId}
            </Badge>
          </div>
        )}

        {mode === "edit" && initialData?.patientId && (
          <div className="flex items-center gap-2 bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9]">
            <span className="text-xs text-[#7A746F]">Patient ID:</span>
            <Badge variant="neutral" className="font-mono font-bold text-xs">
              {initialData.patientId}
            </Badge>
          </div>
        )}
      </div>

      {/* Duplicate Alert (Non-blocking warning with link) */}
      {duplicateWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="font-bold flex items-center justify-between">
              <span>Possible Matching Patient Record Detected</span>
              <Link
                href={`/patients/${duplicateWarning.patientId}`}
                target="_blank"
                className="text-xs text-[#DE4F3C] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Inspect Existing File &rarr;
              </Link>
            </div>
            <p className="leading-relaxed text-[#7A746F]">
              A profile already exists for{" "}
              <strong className="text-[#201C1A]">
                {duplicateWarning.name}
              </strong>{" "}
              (ID:{" "}
              <span className="font-mono font-semibold text-[#201C1A]">
                {duplicateWarning.patientId}
              </span>
              {duplicateWarning.phone
                ? `, Phone: ${duplicateWarning.phone}`
                : ""}
              {duplicateWarning.secondaryPhone
                ? `, Alt: ${duplicateWarning.secondaryPhone}`
                : ""}
              ). If this is a distinct patient with the same name, you may still
              proceed.
            </p>
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {errors.form && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 font-medium">
          {errors.form}
        </div>
      )}

      {/* ====================================================================== */}
      {/* SECTION A: PATIENT IDENTITY & FAMILY */}
      {/* ====================================================================== */}
      <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/30 p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
          <User className="h-4 w-4 text-[#DE4F3C]" />
          <h4 className="font-serif text-sm font-bold text-[#201C1A] uppercase tracking-wide">
            Section A &mdash; Patient Identity & Family
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Full Name */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Full Name <span className="text-[#DE4F3C]">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mohammad Rahim Chowdhury"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.name
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
              required
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.name}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Date of Birth <span className="text-[#DE4F3C]">*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={dateOfBirth}
              max={new Date().toISOString().split("T")[0]}
              onChange={handleDobChange}
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2 text-xs text-[#201C1A] transition-all focus:outline-hidden focus:ring-2",
                errors.dateOfBirth
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
              required
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Age (Years)
            </label>
            <input
              type="number"
              name="age"
              value={age}
              min={0}
              max={130}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Auto-calculated from DOB"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.age
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.age && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.age}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Sex / Gender <span className="text-[#DE4F3C]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-medium capitalize transition-all cursor-pointer text-center",
                    gender === g
                      ? "border-[#DE4F3C] bg-[#FDF0EE] text-[#DE4F3C] font-bold"
                      : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            {errors.gender && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.gender}
              </p>
            )}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              step="0.1"
              value={weight}
              min={1}
              max={500}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 68.5"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.weight
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.weight && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.weight}
              </p>
            )}
          </div>

          {/* Father's Name */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Father&apos;s Name
            </label>
            <input
              type="text"
              name="fatherName"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="e.g. Late Abdul Karim"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Mother's Name */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Mother&apos;s Name
            </label>
            <input
              type="text"
              name="motherName"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="e.g. Fatema Begum"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Guardian Name */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Guardian&apos;s Name (if applicable)
            </label>
            <input
              type="text"
              name="guardianName"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Tariqul Islam"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Guardian Relationship */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Guardian Relationship
            </label>
            <input
              type="text"
              name="guardianRelationship"
              value={guardianRelationship}
              onChange={(e) => setGuardianRelationship(e.target.value)}
              placeholder="e.g. Spouse, Elder Brother, Uncle, Legal Guardian"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* SECTION B: CONTACT & EMERGENCY INFORMATION */}
      {/* ====================================================================== */}
      <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/30 p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
          <Phone className="h-4 w-4 text-[#DE4F3C]" />
          <h4 className="font-serif text-sm font-bold text-[#201C1A] uppercase tracking-wide">
            Section B &mdash; Contact & Emergency Information
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Primary Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Primary Mobile Number
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01712-345678 or +8801712345678"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.phone
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.phone && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Secondary Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Alternative Contact Number
            </label>
            <input
              type="tel"
              name="secondaryPhone"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              placeholder="e.g. 01812-987654 or Landline"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.secondaryPhone
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.secondaryPhone && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.secondaryPhone}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
              className={cn(
                "w-full rounded-lg border bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:outline-hidden focus:ring-2",
                errors.email
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                  : "border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.email && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* SMS Follow-up Reminder Consent */}
          <div className="sm:col-span-2 rounded-lg border border-[#EAE3D9] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#DE4F3C]" />
                <label className="text-xs font-bold text-[#201C1A]">
                  SMS Follow-up Reminder Consent
                </label>
              </div>
              <Badge
                variant={
                  smsConsentStatus === "opted_in"
                    ? "success"
                    : smsConsentStatus === "opted_out"
                    ? "danger"
                    : "warning"
                }
                className="text-[10px] uppercase font-bold tracking-wider"
              >
                {smsConsentStatus === "opted_in"
                  ? "Consent Granted"
                  : smsConsentStatus === "opted_out"
                  ? "Consent Refused"
                  : "Consent Pending"}
              </Badge>
            </div>

            <p className="text-[11px] text-[#7A746F] leading-relaxed">
              Automated reminders are scheduled 24h before (and 3h before) scheduled appointments.
              To maintain complete patient privacy, SMS messages contain only appointment date, time, and chamber name.
              <strong> Medical diagnoses, prescriptions, and clinical history are strictly never included.</strong>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSmsConsentStatus("opted_in")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-medium transition-all cursor-pointer",
                  smsConsentStatus === "opted_in"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs"
                    : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                )}
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Opted In (Send SMS)</span>
              </button>

              <button
                type="button"
                onClick={() => setSmsConsentStatus("opted_out")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-medium transition-all cursor-pointer",
                  smsConsentStatus === "opted_out"
                    ? "border-rose-600 bg-rose-50 text-rose-800 font-bold shadow-xs"
                    : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                )}
              >
                <span className="text-rose-600 font-bold">&times;</span>
                <span>Opted Out (No SMS)</span>
              </button>

              <button
                type="button"
                onClick={() => setSmsConsentStatus("unknown")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-medium transition-all cursor-pointer",
                  smsConsentStatus === "unknown"
                    ? "border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-xs"
                    : "border-[#EAE3D9] bg-white text-[#7A746F] hover:border-[#201C1A]"
                )}
              >
                <span>Unknown / Not Asked</span>
              </button>
            </div>
            {initialData?.smsConsentAt && (
              <p className="text-[10px] text-[#7A746F] italic">
                Last recorded: {new Date(initialData.smsConsentAt).toLocaleString()} ({initialData.smsConsentSource || "registration"})
              </p>
            )}
          </div>

          {/* Present Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Present Residential Address
            </label>
            <textarea
              rows={2}
              name="address"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="House / Holding, Road, Area, Thana, District"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
            {errors.address && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.address}
              </p>
            )}
          </div>

          {/* Permanent Address */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Permanent Address
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#7A746F] hover:text-[#201C1A]">
                <input
                  type="checkbox"
                  checked={sameAsPresentAddress}
                  onChange={(e) => handleToggleSameAddress(e.target.checked)}
                  className="rounded border-[#EAE3D9] text-[#DE4F3C] focus:ring-[#DE4F3C]/30 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Same as present address</span>
              </label>
            </div>
            <textarea
              rows={2}
              name="permanentAddress"
              value={sameAsPresentAddress ? address : permanentAddress}
              disabled={sameAsPresentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              placeholder="Permanent home district, Village, Post office, Thana"
              className={cn(
                "w-full rounded-lg border px-3.5 py-2 text-xs transition-all focus:outline-hidden focus:ring-2",
                sameAsPresentAddress
                  ? "bg-[#FAF5EE]/60 text-[#7A746F] border-dashed border-[#EAE3D9] cursor-not-allowed"
                  : "bg-white text-[#201C1A] border-[#EAE3D9] focus:border-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              )}
            />
            {errors.permanentAddress && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">
                {errors.permanentAddress}
              </p>
            )}
          </div>

          {/* Emergency Contact Block */}
          <div className="sm:col-span-2 rounded-lg border border-[#EAE3D9] bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                Emergency Contact Person
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#7A746F] mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Dr. Mahmudul Hasan"
                  className="w-full rounded-md border border-[#EAE3D9] bg-white px-3 py-1.5 text-xs text-[#201C1A] placeholder-[#7A746F] focus:border-[#DE4F3C] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A746F] mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  value={emergencyContactRelationship}
                  onChange={(e) =>
                    setEmergencyContactRelationship(e.target.value)
                  }
                  placeholder="e.g. Spouse / Brother"
                  className="w-full rounded-md border border-[#EAE3D9] bg-white px-3 py-1.5 text-xs text-[#201C1A] placeholder-[#7A746F] focus:border-[#DE4F3C] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7A746F] mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="e.g. 01711-000000"
                  className={cn(
                    "w-full rounded-md border bg-white px-3 py-1.5 text-xs text-[#201C1A] placeholder-[#7A746F] focus:outline-hidden",
                    errors.emergencyContactPhone
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-[#EAE3D9] focus:border-[#DE4F3C]"
                  )}
                />
                {errors.emergencyContactPhone && (
                  <p className="mt-1 text-[10px] text-rose-600 font-medium">
                    {errors.emergencyContactPhone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* SECTION C: ADDITIONAL CLINICAL & SOCIAL INFORMATION */}
      {/* ====================================================================== */}
      <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/30 p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
          <Activity className="h-4 w-4 text-[#DE4F3C]" />
          <h4 className="font-serif text-sm font-bold text-[#201C1A] uppercase tracking-wide">
            Section C &mdash; Clinical Background & Medical History
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Blood Group */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Blood Group
            </label>
            <select
              name="bloodGroup"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup | "")}
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            >
              <option value="">Select Blood Group</option>
              {bloodGroupOptions.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-xs font-semibold text-[#201C1A] mb-1">
              Occupation
            </label>
            <input
              type="text"
              name="occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Teacher, Engineer, Businessman, Homemaker"
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2.5 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Known Allergies */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-[#201C1A]">
                Known Drug & Food Allergies
              </label>
              <span className="text-[11px] text-[#7A746F]">
                Click pill to toggle or type below
              </span>
            </div>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ALLERGIES.map((item) => {
                const isActive = allergies
                  .toLowerCase()
                  .includes(item.toLowerCase());
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleAddAllergyPill(item)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer",
                      isActive
                        ? "bg-[#FDF0EE] text-[#DE4F3C] border-[#DE4F3C] font-semibold shadow-2xs"
                        : "bg-white text-[#7A746F] border-[#EAE3D9] hover:border-[#201C1A] hover:text-[#201C1A]"
                    )}
                  >
                    {isActive ? `✓ ${item}` : `+ ${item}`}
                  </button>
                );
              })}
            </div>

            <textarea
              rows={2}
              name="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="List drug allergies, severity, skin reactions, or anaphylaxis..."
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Medical History & Chronic Conditions */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-[#201C1A]">
                Past Medical History & Chronic Conditions
              </label>
              <span className="text-[11px] text-[#7A746F]">
                Click pill to add or type details
              </span>
            </div>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS.map((item) => {
                const isActive = medicalHistory
                  .toLowerCase()
                  .includes(item.toLowerCase());
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleAddConditionPill(item)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer",
                      isActive
                        ? "bg-[#FAF5EE] text-[#DE4F3C] border-[#DE4F3C] font-semibold shadow-2xs"
                        : "bg-white text-[#7A746F] border-[#EAE3D9] hover:border-[#201C1A] hover:text-[#201C1A]"
                    )}
                  >
                    {isActive ? `✓ ${item}` : `+ ${item}`}
                  </button>
                );
              })}
            </div>

            <textarea
              rows={2}
              name="medicalHistory"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="Chronic illnesses, prior surgeries, major hospitalizations, family history..."
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Current Medications */}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-[#201C1A]">
              Current Medications (Patient-Reported)
            </label>
            <textarea
              rows={2}
              name="currentMedications"
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              placeholder="e.g. Tab. Losartan 50mg (1+0+0), Tab. Metformin 500mg (1+0+1)..."
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>

          {/* Clinical Notes */}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-[#201C1A]">
              Patient-Level Doctor Notes (Confidential)
            </label>
            <textarea
              rows={2}
              name="patientNotes"
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="Special instructions, dietary habits, socioeconomic background, mobility restrictions..."
              className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-[#EAE3D9] pt-5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="gap-2 text-xs font-medium px-5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>
                {mode === "create"
                  ? "Register Patient Profile"
                  : "Save Profile Changes"}
              </span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
