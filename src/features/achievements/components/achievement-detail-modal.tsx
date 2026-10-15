"use client";

import * as React from "react";
import { DoctorAchievement } from "@/types/achievement";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Printer,
  FileCheck2,
  BookOpen,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getCategoryIcon, getCategoryBadgeClass } from "./achievement-card";
import { cn } from "@/lib/utils";

export interface AchievementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: DoctorAchievement | null;
  onEdit?: (achievement: DoctorAchievement) => void;
  onDelete?: (id: string, title: string) => void;
}

export function AchievementDetailModal({
  isOpen,
  onClose,
  achievement,
  onEdit,
  onDelete,
}: AchievementDetailModalProps) {
  if (!achievement) return null;

  const badgeClass = getCategoryBadgeClass(achievement.category);

  const isExpired = Boolean(
    achievement.expirationDate &&
      new Date(achievement.expirationDate + "T00:00:00").getTime() <
        new Date().setHours(0, 0, 0, 0)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#EAE3D9] overflow-hidden">
        {/* Header */}
        <ModalHeader className="border-b border-[#FAF5EE] bg-[#FAF8F5] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
                {React.createElement(getCategoryIcon(achievement.category), {
                  className: "h-5 w-5",
                })}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                      badgeClass
                    )}
                  >
                    <span>{achievement.category}</span>
                  </span>
                  {!achievement.isPublished && (
                    <Badge variant="warning" size="sm" className="text-[10px]">
                      Draft / Hidden
                    </Badge>
                  )}
                  {achievement.expirationDate && (
                    <Badge
                      variant={isExpired ? "danger" : "neutral"}
                      size="sm"
                      className="text-[10px]"
                    >
                      {isExpired
                        ? "Expired"
                        : `Valid until ${achievement.expirationDate}`}
                    </Badge>
                  )}
                </div>
                <ModalTitle className="text-base font-serif font-bold text-[#201C1A]">
                  {achievement.title}
                </ModalTitle>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs h-8 shrink-0 print:hidden text-[#201C1A]"
            >
              <Printer className="h-3.5 w-3.5 text-[#7A746F]" />
              <span>Print</span>
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4 max-h-[72vh] overflow-y-auto px-6 py-4 text-xs">
          {/* Metadata Card */}
          <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievement.institution && (
              <div>
                <span className="text-[#7A746F] block text-[11px] font-medium">
                  Issuing Institution / Organization
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-[#201C1A] mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-[#DE4F3C] shrink-0" />
                  <span>{achievement.institution}</span>
                </div>
              </div>
            )}

            {achievement.achievementDate && (
              <div>
                <span className="text-[#7A746F] block text-[11px] font-medium">
                  Achievement / Conferral Date
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-[#201C1A] mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-[#DE4F3C] shrink-0" />
                  <span>
                    {new Date(
                      achievement.achievementDate + "T00:00:00"
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            {achievement.expirationDate && (
              <div>
                <span className="text-[#7A746F] block text-[11px] font-medium">
                  Certification Expiration Date
                </span>
                <span
                  className={cn(
                    "font-semibold mt-0.5 block",
                    isExpired ? "text-rose-600" : "text-[#201C1A]"
                  )}
                >
                  {achievement.expirationDate} {isExpired ? "(Expired)" : "(Active)"}
                </span>
              </div>
            )}

            <div>
              <span className="text-[#7A746F] block text-[11px] font-medium">
                Display Order Priority
              </span>
              <span className="font-semibold text-[#201C1A] mt-0.5 block">
                #{achievement.displayOrder}
              </span>
            </div>
          </div>

          {/* Description */}
          {achievement.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-[#201C1A] uppercase tracking-wider">
                Professional Scope & Details
              </h4>
              <div className="p-3.5 rounded-xl bg-white border border-[#EAE3D9] text-[#201C1A] leading-relaxed whitespace-pre-line text-xs">
                {achievement.description}
              </div>
            </div>
          )}

          {/* Google Drive Evidence Document */}
          {achievement.driveUrl && (
            <div className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <FileCheck2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Verified Google Drive Evidence Document</span>
                </div>
                <Badge variant="success" size="sm" className="text-[10px]">
                  Link-Only Verified
                </Badge>
              </div>

              {achievement.evidenceTitle && (
                <div className="text-xs font-semibold text-emerald-900">
                  {achievement.evidenceTitle}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={achievement.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  <span>Open Evidence Document</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-start gap-1.5 text-[11px] text-emerald-800/80 pt-1">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  Access to linked evidence files depends on Google Drive sharing permissions set by the file owner. No document files are uploaded or stored within this application.
                </span>
              </div>
            </div>
          )}

          {/* External Publication / Research Link */}
          {achievement.publicationUrl && (
            <div className="p-4 rounded-xl border border-sky-200/90 bg-sky-50/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-950">
                <BookOpen className="h-4 w-4 text-sky-700 shrink-0" />
                <span>External Publication / Research URL</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={achievement.publicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-2xs"
                >
                  <span className="truncate max-w-sm">{achievement.publicationUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {/* Audit Metadata */}
          <div className="pt-2 border-t border-[#FAF5EE] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#7A746F]">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>
                Created: {new Date(achievement.createdAt).toLocaleString("en-US")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Verified Doctor Profile Record</span>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="border-t border-[#FAF5EE] bg-[#FAF8F5] px-6 py-3.5 flex items-center justify-between">
          <div>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
                onClick={() => {
                  onDelete(achievement.id, achievement.title);
                  onClose();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  onEdit(achievement);
                  onClose();
                }}
              >
                <Edit2 className="h-3.5 w-3.5 text-[#7A746F]" />
                <span>Edit</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
