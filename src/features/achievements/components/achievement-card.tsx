"use client";

import * as React from "react";
import { DoctorAchievement, AchievementCategory } from "@/types/achievement";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Award,
  Trophy,
  Activity,
  Presentation,
  BookOpen,
  Building2,
  Milestone,
  Sparkles,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AchievementCardProps {
  achievement: DoctorAchievement;
  onView: (achievement: DoctorAchievement) => void;
  onEdit: (achievement: DoctorAchievement) => void;
  onDelete: (id: string, title: string) => void;
}

export function getCategoryIcon(category: AchievementCategory) {
  switch (category) {
    case "Academic Qualifications":
      return GraduationCap;
    case "Professional Certifications":
      return Award;
    case "Awards & Honors":
      return Trophy;
    case "Medical Training & Workshops":
      return Activity;
    case "Conferences & Seminars":
      return Presentation;
    case "Research & Publications":
      return BookOpen;
    case "Professional Memberships":
      return Building2;
    case "Career Milestones":
      return Milestone;
    default:
      return Sparkles;
  }
}

export function getCategoryBadgeClass(category: AchievementCategory) {
  switch (category) {
    case "Academic Qualifications":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Professional Certifications":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Awards & Honors":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Medical Training & Workshops":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Conferences & Seminars":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Research & Publications":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Professional Memberships":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "Career Milestones":
      return "bg-orange-50 text-orange-800 border-orange-200";
    default:
      return "bg-stone-50 text-stone-700 border-stone-200";
  }
}

export function AchievementCard({
  achievement,
  onView,
  onEdit,
  onDelete,
}: AchievementCardProps) {
  const Icon = getCategoryIcon(achievement.category);
  const badgeClass = getCategoryBadgeClass(achievement.category);

  // Expiration check
  const isExpired = Boolean(
    achievement.expirationDate &&
      new Date(achievement.expirationDate + "T00:00:00").getTime() <
        new Date().setHours(0, 0, 0, 0)
  );

  return (
    <Card className="group relative border border-[#EAE3D9] bg-white p-5 shadow-2xs hover:shadow-sm transition-all duration-200 rounded-xl flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header: Category Badge & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
              badgeClass
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{achievement.category}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {!achievement.isPublished && (
              <Badge variant="warning" size="sm" className="text-[10px]">
                Draft
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
        </div>

        {/* Title & Institution */}
        <div>
          <h3
            className="font-serif text-base font-bold text-[#201C1A] group-hover:text-[#DE4F3C] transition-colors cursor-pointer"
            onClick={() => onView(achievement)}
          >
            {achievement.title}
          </h3>
          {achievement.institution && (
            <p className="text-xs font-medium text-[#7A746F] mt-0.5">
              {achievement.institution}
            </p>
          )}
        </div>

        {/* Achievement Date */}
        {achievement.achievementDate && (
          <div className="flex items-center gap-1.5 text-xs text-[#7A746F]">
            <Calendar className="h-3.5 w-3.5 text-[#DE4F3C] shrink-0" />
            <span>
              Achieved:{" "}
              {new Date(
                achievement.achievementDate + "T00:00:00"
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Description snippet */}
        {achievement.description && (
          <p className="text-xs text-[#201C1A] leading-relaxed line-clamp-2 bg-[#FAF5EE]/50 p-2.5 rounded-lg border border-[#EAE3D9]/60">
            {achievement.description}
          </p>
        )}

        {/* Evidence & Publication Links */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {achievement.driveUrl && (
            <a
              href={achievement.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              title="Verified Google Drive Evidence Document"
            >
              <FileCheck2 className="h-3 w-3 text-emerald-600" />
              <span>Evidence Document</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            </a>
          )}

          {achievement.publicationUrl && (
            <a
              href={achievement.publicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
              title="Open External Publication Link"
            >
              <BookOpen className="h-3 w-3 text-sky-600" />
              <span>Publication Link</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-4 pt-3 border-t border-[#FAF5EE] flex items-center justify-between">
        <div className="text-[10px] text-[#7A746F]">
          Order: #{achievement.displayOrder}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 gap-1 text-[#201C1A]"
            onClick={() => onView(achievement)}
          >
            <Eye className="h-3 w-3 text-[#7A746F]" />
            <span>View</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 gap-1 text-[#201C1A]"
            onClick={() => onEdit(achievement)}
          >
            <Edit2 className="h-3 w-3 text-[#7A746F]" />
            <span>Edit</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            onClick={() => onDelete(achievement.id, achievement.title)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
