"use client";

import * as React from "react";
import {
  DoctorAchievement,
  AchievementCategory,
  ACHIEVEMENT_CATEGORIES,
} from "@/types/achievement";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import { validateAndNormalizePublicationUrl } from "@/lib/validators/publication-url-validator";
import {
  Award,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAchievement?: DoctorAchievement | null;
  onSuccess: () => void;
}

export function AchievementModal({
  isOpen,
  onClose,
  existingAchievement,
  onSuccess,
}: AchievementModalProps) {
  const isEditing = Boolean(existingAchievement);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<AchievementCategory>(
    "Academic Qualifications"
  );
  const [institution, setInstitution] = React.useState("");
  const [achievementDate, setAchievementDate] = React.useState("");
  const [expirationDate, setExpirationDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [evidenceTitle, setEvidenceTitle] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [publicationUrl, setPublicationUrl] = React.useState("");
  const [displayOrder, setDisplayOrder] = React.useState(0);
  const [isPublished, setIsPublished] = React.useState(true);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Live Drive URL validation state
  const driveValidation = React.useMemo(() => {
    if (!driveUrl || driveUrl.trim().length === 0) return null;
    return validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
  }, [driveUrl]);

  // Live Publication URL validation state
  const pubValidation = React.useMemo(() => {
    if (!publicationUrl || publicationUrl.trim().length === 0) return null;
    return validateAndNormalizePublicationUrl(publicationUrl.trim());
  }, [publicationUrl]);

  React.useEffect(() => {
    if (existingAchievement) {
      setTitle(existingAchievement.title);
      setCategory(existingAchievement.category);
      setInstitution(existingAchievement.institution || "");
      setAchievementDate(existingAchievement.achievementDate || "");
      setExpirationDate(existingAchievement.expirationDate || "");
      setDescription(existingAchievement.description || "");
      setEvidenceTitle(existingAchievement.evidenceTitle || "");
      setDriveUrl(existingAchievement.driveUrl || "");
      setPublicationUrl(existingAchievement.publicationUrl || "");
      setDisplayOrder(existingAchievement.displayOrder);
      setIsPublished(existingAchievement.isPublished);
    } else {
      setTitle("");
      setCategory("Academic Qualifications");
      setInstitution("");
      setAchievementDate("");
      setExpirationDate("");
      setDescription("");
      setEvidenceTitle("");
      setDriveUrl("");
      setPublicationUrl("");
      setDisplayOrder(0);
      setIsPublished(true);
    }
    setError(null);
  }, [existingAchievement, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("Achievement title must be at least 2 characters long.");
      return;
    }

    if (
      achievementDate &&
      expirationDate &&
      expirationDate < achievementDate
    ) {
      setError("Expiration date cannot be earlier than achievement date.");
      return;
    }

    if (driveUrl.trim().length > 0) {
      const driveCheck = validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
      if (!driveCheck.isValid) {
        setError(driveCheck.error || "Must be a valid HTTPS Google Drive URL");
        return;
      }
    }

    if (publicationUrl.trim().length > 0) {
      const pubCheck = validateAndNormalizePublicationUrl(publicationUrl.trim());
      if (!pubCheck.isValid) {
        setError(pubCheck.error || "Must be a valid secure HTTPS publication URL");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        title: title.trim(),
        category,
        institution: institution.trim() || null,
        achievementDate: achievementDate || null,
        expirationDate: expirationDate || null,
        description: description.trim() || null,
        evidenceTitle: evidenceTitle.trim() || null,
        driveUrl: driveUrl.trim() || null,
        publicationUrl: publicationUrl.trim() || null,
        displayOrder: Number(displayOrder) || 0,
        isPublished,
      };

      if (isEditing && existingAchievement) {
        const res = await fetch(`/api/achievements/${existingAchievement.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update achievement record");
        }
      } else {
        const res = await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to save achievement record");
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save achievement record";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#EAE3D9] overflow-hidden">
        <ModalHeader className="border-b border-[#FAF5EE] bg-[#FAF8F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-serif font-bold text-[#201C1A]">
                {isEditing ? "Edit Achievement Record" : "Record Doctor Achievement"}
              </ModalTitle>
              <ModalDescription className="text-xs text-[#7A746F]">
                Document professional qualifications, certifications, awards, and verified evidence.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4 max-h-[72vh] overflow-y-auto px-6 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title & Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Achievement / Qualification Title <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Master of Surgery (MS), Fellowship in Laparoscopy, Best Clinical Paper Award"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Category <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as AchievementCategory)
                  }
                  className="h-9 text-xs"
                >
                  {ACHIEVEMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Issuing Institution / Organization
                </label>
                <Input
                  placeholder="e.g. Royal College of Surgeons, BSMMU, WHO"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Achievement Date & Expiration Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Achievement / Conferral Date
                </label>
                <Input
                  type="date"
                  value={achievementDate}
                  onChange={(e) => setAchievementDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Expiration Date (for certifications)
                </label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Description & Details */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Professional Description & Summary
              </label>
              <Textarea
                placeholder="Details of coursework, clinical scope, conference theme, publication abstract, or credential honors..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Evidence Document Title & Google Drive Link */}
            <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                <FileText className="h-4 w-4 text-emerald-700" />
                <span>Verified Google Drive Evidence Document (Link-Only)</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-900">
                  Certificate / Document Title
                </label>
                <Input
                  placeholder="e.g. Official MS Degree Certificate, Certified Fellowship Transcript"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-900">
                  Google Drive URL
                </label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />

                {driveValidation && (
                  <div className="pt-1">
                    {driveValidation.isValid ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Valid {driveValidation.resourceType} link accepted</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>{driveValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-emerald-800/80">
                  Note: Files are stored in your Google Drive and accessed via link only. No file data is uploaded to this application.
                </p>
              </div>
            </div>

            {/* External Publication / Research Link */}
            <div className="p-3.5 rounded-xl border border-sky-200/80 bg-sky-50/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-950">
                <ExternalLink className="h-4 w-4 text-sky-700" />
                <span>External Publication / Research URL (DOI, PubMed, Journal)</span>
              </div>

              <div className="space-y-1">
                <Input
                  placeholder="https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/..."
                  value={publicationUrl}
                  onChange={(e) => setPublicationUrl(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />

                {pubValidation && (
                  <div className="pt-1">
                    {pubValidation.isValid ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-sky-700 font-medium">
                        <CheckCircle2 className="h-3 w-3 text-sky-600" />
                        <span>Valid secure HTTPS publication link</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>{pubValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Display Order & Published Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Display Order Priority
                </label>
                <Input
                  type="number"
                  min={0}
                  max={99999}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs"
                />
                <span className="text-[11px] text-[#7A746F]">
                  Lower numbers appear first in the professional profile.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-[#EAE3D9] text-[#DE4F3C] focus:ring-[#DE4F3C]"
                />
                <label htmlFor="isPublished" className="text-xs font-semibold text-[#201C1A] cursor-pointer">
                  Publish to Doctor Profile
                </label>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="border-t border-[#FAF5EE] bg-[#FAF8F5] px-6 py-3.5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5"
            >
              <Award className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Record Achievement"}</span>
            </Button>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  );
}
