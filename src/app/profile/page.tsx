"use client";

import * as React from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DoctorProfileCard } from "@/features/settings";
import { AchievementsList } from "@/features/achievements";
import { ShieldCheck, Award } from "lucide-react";

export default function DoctorProfilePage() {
  return (
    <AdminShell>
      <PageContainer className="space-y-6 max-w-5xl">
        <PageHeader
          label="CLINICIAN IDENTITY &amp; CREDENTIALS"
          title="Doctor Profile"
          description="Verified professional credentials, qualifications, designations, and clinical affiliations for Dr. Mohammad Rubaiath Tashfin."
          actions={
            <div className="flex items-center gap-2 text-xs text-[#7A746F] bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Doctor Profile</span>
            </div>
          }
        />

        {/* Official Doctor Profile Card */}
        <DoctorProfileCard />

        {/* Doctor Achievements & Evidence Section */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
            <Award className="h-5 w-5 text-[#DE4F3C]" />
            <h3 className="font-serif text-lg font-bold text-[#201C1A]">
              Verified Lifetime Achievements &amp; Evidence
            </h3>
          </div>
          <AchievementsList />
        </div>
      </PageContainer>
    </AdminShell>
  );
}
