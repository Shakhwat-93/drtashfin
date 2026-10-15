"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { AchievementsList } from "@/features/achievements";
import { Award, ShieldCheck } from "lucide-react";

export default function AchievementsPage() {
  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Page Header */}
        <PageHeader
          label="DOCTOR PROFILE & CREDENTIALS"
          title="Doctor Lifetime Achievements"
          description="Manage Dr. Tashfin's lifetime qualifications, certifications, awards, training, research publications, and verified Google Drive evidence."
          actions={
            <div className="flex items-center gap-2 text-xs text-[#7A746F] bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Doctor Credentials</span>
            </div>
          }
        />

        {/* Main Achievements List & Filter Management */}
        <AchievementsList />
      </PageContainer>
    </AdminShell>
  );
}
