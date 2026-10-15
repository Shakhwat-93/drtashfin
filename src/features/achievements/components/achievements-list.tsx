"use client";

import * as React from "react";
import {
  DoctorAchievement,
  ACHIEVEMENT_CATEGORIES,
} from "@/types/achievement";
import { useAchievements } from "../hooks/use-achievements";
import { AchievementCard } from "./achievement-card";
import { AchievementModal } from "./achievement-modal";
import { AchievementDetailModal } from "./achievement-detail-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  Award,
  Plus,
  Download,
  Printer,
  Search,
  RefreshCw,
  FileCheck2,
  Sparkles,
  Layers,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export function AchievementsList() {
  const {
    achievements,
    categoryCounts,
    total,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    publishedFilter,
    setPublishedFilter,
    refresh,
    deleteAchievement,
    exportCsvUrl,
  } = useAchievements();

  // Local modal states
  const [isAddEditOpen, setIsAddEditOpen] = React.useState(false);
  const [editingAchievement, setEditingAchievement] =
    React.useState<DoctorAchievement | null>(null);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [viewingAchievement, setViewingAchievement] =
    React.useState<DoctorAchievement | null>(null);

  // Deletion confirmation state
  const [achievementToDelete, setAchievementToDelete] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = React.useState<
    "displayOrder" | "dateDesc" | "dateAsc"
  >("displayOrder");

  // Sorted achievements
  const sortedAchievements = React.useMemo(() => {
    return [...achievements].sort((a, b) => {
      if (sortBy === "displayOrder") {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return (b.achievementDate || "").localeCompare(a.achievementDate || "");
      }
      if (sortBy === "dateDesc") {
        return (b.achievementDate || "").localeCompare(a.achievementDate || "");
      }
      return (a.achievementDate || "").localeCompare(b.achievementDate || "");
    });
  }, [achievements, sortBy]);

  // Summary counts
  const publishedCount = achievements.filter((a) => a.isPublished).length;
  const verifiedEvidenceCount = achievements.filter((a) => Boolean(a.driveUrl)).length;
  const categoriesCount = Object.keys(categoryCounts).length;

  const handleOpenAdd = () => {
    setEditingAchievement(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (achievement: DoctorAchievement) => {
    setEditingAchievement(achievement);
    setIsAddEditOpen(true);
  };

  const handleOpenView = (achievement: DoctorAchievement) => {
    setViewingAchievement(achievement);
    setIsDetailOpen(true);
  };

  const handleDeletePrompt = (id: string, title: string) => {
    setDeleteError(null);
    setAchievementToDelete({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!achievementToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAchievement(achievementToDelete.id);
      setAchievementToDelete(null);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete achievement"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-stone-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-black">
              Dr. Tashfin — Professional Lifetime Achievements & Credentials
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Official summary of verified medical qualifications, certifications, awards, and research accomplishments.
            </p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div>
              Generated:{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div>Total Records: {achievements.length}</div>
          </div>
        </div>
      </div>

      {/* Screen Header Toolbar & Stat Cards */}
      <div className="print:hidden space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A746F]">Total Achievements</span>
              <Award className="h-4 w-4 text-[#DE4F3C]" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#201C1A]">
              {total}
            </div>
          </Card>

          <Card className="p-4 border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A746F]">Active Categories</span>
              <Layers className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#201C1A]">
              {categoriesCount}
            </div>
          </Card>

          <Card className="p-4 border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A746F]">Published in Profile</span>
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#201C1A]">
              {publishedCount}
            </div>
          </Card>

          <Card className="p-4 border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A746F]">Verified Evidence</span>
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#201C1A]">
              {verifiedEvidenceCount}
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs h-9 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Achievement</span>
            </Button>

            <a href={exportCsvUrl} download="doctor_achievements.csv">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9 text-[#201C1A]"
              >
                <Download className="h-3.5 w-3.5 text-[#7A746F]" />
                <span>Export CSV</span>
              </Button>
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-9 text-[#201C1A]"
            >
              <Printer className="h-3.5 w-3.5 text-[#7A746F]" />
              <span>Print Summary</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading}
              className="h-9 w-9 p-0 text-[#7A746F] hover:text-[#201C1A]"
              title="Refresh Achievements"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Search, Status & Sorting Filter Controls */}
        <Card className="p-3 border-[#EAE3D9] bg-[#FAF8F5] rounded-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="h-4 w-4 text-[#7A746F] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by title, institution, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                aria-label="Filter by publication status"
                value={String(publishedFilter)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "all") setPublishedFilter("all");
                  else setPublishedFilter(val === "true");
                }}
                className="w-full h-9 px-3 rounded-lg border border-[#EAE3D9] bg-white text-xs text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#DE4F3C]"
              >
                <option value="all">All Statuses (Published & Draft)</option>
                <option value="true">Published Only</option>
                <option value="false">Draft / Hidden Only</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="md:col-span-3">
              <select
                aria-label="Sort achievements order"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "displayOrder" | "dateDesc" | "dateAsc"
                  )
                }
                className="w-full h-9 px-3 rounded-lg border border-[#EAE3D9] bg-white text-xs text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#DE4F3C]"
              >
                <option value="displayOrder">Sort: Display Order Priority</option>
                <option value="dateDesc">Sort: Date (Newest First)</option>
                <option value="dateAsc">Sort: Date (Oldest First)</option>
              </select>
            </div>
          </div>

          {/* Category Pill Filters with Counts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#EAE3D9]/60">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-[#201C1A] text-white"
                  : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:bg-[#FAF5EE]"
              }`}
            >
              All Categories ({total})
            </button>

            {ACHIEVEMENT_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#DE4F3C] text-white"
                      : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:bg-[#FAF5EE]"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[#FAF5EE] text-[#7A746F]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              className="p-5 border border-[#EAE3D9] bg-white rounded-xl h-48 animate-pulse space-y-3"
            >
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-5 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
              <div className="h-12 bg-stone-100 rounded w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedAchievements.length === 0 && (
        <Card className="p-12 text-center border-dashed border-[#EAE3D9] bg-white rounded-xl space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#201C1A]">
            No Achievements Found
          </h3>
          <p className="text-xs text-[#7A746F] max-w-md mx-auto">
            {searchQuery || selectedCategory !== "all" || publishedFilter !== "all"
              ? "No records matched your search or filter criteria. Try clearing filters to see all achievements."
              : "No lifetime achievements have been recorded yet. Document Dr. Tashfin's degrees, certifications, awards, workshops, or research publications."}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record First Achievement</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Achievements Cards Grid */}
      {!isLoading && sortedAchievements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={handleDeletePrompt}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AchievementModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        existingAchievement={editingAchievement}
        onSuccess={() => {
          refresh();
        }}
      />

      <AchievementDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        achievement={viewingAchievement}
        onEdit={(a) => {
          setEditingAchievement(a);
          setIsAddEditOpen(true);
        }}
        onDelete={(id, title) => {
          handleDeletePrompt(id, title);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(achievementToDelete)}
        onClose={() => {
          if (!isDeleting) setAchievementToDelete(null);
        }}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#EAE3D9] overflow-hidden">
          <ModalHeader className="border-b border-[#FAF5EE] bg-[#FAF8F5] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle className="text-base font-serif font-bold text-[#201C1A]">
                  Delete Achievement Record
                </ModalTitle>
                <ModalDescription className="text-xs text-[#7A746F]">
                  Confirm permanent removal of this achievement.
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="p-6 space-y-3 text-xs text-[#201C1A]">
            <p>
              Are you sure you want to delete the record for:
            </p>
            <p className="font-semibold font-serif text-sm p-3 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9]">
              &ldquo;{achievementToDelete?.title}&rdquo;
            </p>
            <p className="text-[11px] text-[#7A746F]">
              This action permanently deletes the achievement from Dr. Tashfin&apos;s professional portfolio. Any linked Google Drive files remain completely safe in your Google Drive.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}
          </ModalBody>

          <ModalFooter className="border-t border-[#FAF5EE] bg-[#FAF8F5] px-6 py-3.5 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAchievementToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white hover:text-white border-rose-600 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
