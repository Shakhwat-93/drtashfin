"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
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

export function PatientForm({
  mode,
  initialData,
  nextPatientId,
  isSubmitting = false,
  onSubmit,
  onCancel,
  className,
}: PatientFormProps) {
  // Form State
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
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup | "">(
    initialData?.bloodGroup || ""
  );
  const [address, setAddress] = React.useState(initialData?.address || "");

  // Validation & Duplicate State
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<Patient | null>(
    null
  );

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

  // Duplicate patient checking in create mode
  React.useEffect(() => {
    if (mode !== "create") return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      if (name.trim().length < 3 && phone.trim().length < 7) {
        if (!isCancelled) {
          setDuplicateWarning(null);
        }
        return;
      }

      try {
        const repo = getPatientRepository();
        const found = await repo.checkPotentialDuplicate(name, phone);
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
  }, [mode, name, phone]);

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
      email: email.trim() !== "" ? email.trim() : undefined,
      bloodGroup: bloodGroup !== "" ? (bloodGroup as BloodGroup) : undefined,
      address: address.trim() !== "" ? address.trim() : undefined,
    };

    // Zod validation
    const schema = mode === "create" ? createPatientSchema : updatePatientSchema;
    const validation = schema.safeParse(rawData);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      const issues =
        validation.error.issues ||
        (validation.error as unknown as {
          errors?: Array<{
            path: Array<string | number>;
            message: string;
          }>;
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
      await onSubmit(validation.data as CreatePatientDTO);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Failed to save patient.",
      });
    }
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
      className={cn("space-y-6 max-w-3xl", className)}
      noValidate
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE3D9] pb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[#201C1A]">
            {mode === "create" ? "Patient Registration" : "Edit Patient Information"}
          </h3>
          <p className="text-xs text-[#7A746F]">
            {mode === "create"
              ? "Register a new clinical profile."
              : `Updating medical profile for ${initialData?.name || "Patient"}.`}
          </p>
        </div>

        {mode === "create" && nextPatientId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A746F]">Next ID:</span>
            <Badge variant="primary" className="font-mono font-semibold">
              {nextPatientId}
            </Badge>
          </div>
        )}

        {mode === "edit" && initialData?.patientId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A746F]">Patient ID:</span>
            <Badge variant="neutral" className="font-mono font-semibold">
              {initialData.patientId}
            </Badge>
          </div>
        )}
      </div>

      {/* Duplicate Alert (Non-blocking warning) */}
      {duplicateWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Possible Existing Record</div>
            <p className="leading-relaxed">
              A patient profile already exists for{" "}
              <span className="font-semibold underline">
                {duplicateWarning.name}
              </span>{" "}
              (ID: <span className="font-mono">{duplicateWarning.patientId}</span>
              {duplicateWarning.phone ? `, Phone: ${duplicateWarning.phone}` : ""}).
              You may still proceed if this is a distinct individual.
            </p>
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {errors.form && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {errors.form}
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Full Name <span className="text-[#DE4F3C]">*</span>
          </label>
          <input
            type="text"
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
            Gender <span className="text-[#DE4F3C]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={cn(
                  "rounded-lg border py-2 text-xs font-medium capitalize transition-all cursor-pointer",
                  gender === g
                    ? "border-[#DE4F3C] bg-[#FDF0EE] text-[#DE4F3C] font-semibold"
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
            step="0.1"
            value={weight}
            min={1}
            max={500}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 72.5"
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

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 1712-345678"
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

        {/* Blood Group */}
        <div>
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Blood Group
          </label>
          <select
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
          {errors.bloodGroup && (
            <p className="mt-1 text-[11px] text-rose-600 font-medium">
              {errors.bloodGroup}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Email Address
          </label>
          <input
            type="email"
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

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#201C1A] mb-1">
            Residential Address
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, City, District"
            className="w-full rounded-lg border border-[#EAE3D9] bg-white px-3.5 py-2 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
          />
          {errors.address && (
            <p className="mt-1 text-[11px] text-rose-600 font-medium">
              {errors.address}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-[#EAE3D9] pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>
                {mode === "create" ? "Create Patient Profile" : "Save Changes"}
              </span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
