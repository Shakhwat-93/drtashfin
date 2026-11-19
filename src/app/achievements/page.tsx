"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { AchievementsList } from "@/features/achievements";
import { ShieldCheck } from "lucide-react";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { getDoctorProfile } from "@/config/doctor-profile";

export default function AchievementsPage() {
  const isDemo = useDemoMode();
  const profile = getDoctorProfile(isDemo);

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Page Header */}
        <PageHeader
          label="DOCTOR PROFILE & CREDENTIALS"
          title="Doctor Lifetime Achievements"
          description={`Manage ${profile.fullName}'s lifetime qualifications, certifications, awards, training, research publications, and verified Google Drive evidence.`}
          actions={
            <div className="flex items-center gap-2 text-xs text-[#7A746F] bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9] max-w-full">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{isDemo ? "Demonstration Credentials" : "Verified Doctor Credentials"}</span>
            </div>
          }
        />

        {/* Main Achievements List & Filter Management */}
        <AchievementsList />
      </PageContainer>
    </AdminShell>
  );
}
