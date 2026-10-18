"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SmsGatewaySettingsSection, DoctorProfileCard } from "@/features/settings";
import { Sliders, ShieldCheck, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <AdminShell>
      <PageContainer className="space-y-6 max-w-5xl">
        {/* Page Header */}
        <PageHeader
          label="SYSTEM CONFIGURATION"
          title="Settings"
          description="Manage clinical communication gateways, doctor credentials, and system integrations."
          actions={
            <div className="flex items-center gap-2 text-xs text-[#7A746F] bg-[#FAF5EE] px-3 py-1.5 rounded-lg border border-[#EAE3D9]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Doctor Authenticated Session</span>
            </div>
          }
        />

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Official Doctor Profile Card */}
          <DoctorProfileCard />

          {/* Doctor Achievements & Profile Card */}
          <Card className="p-5 border border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#201C1A]">
                    Doctor Lifetime Achievements & Evidence
                  </h3>
                  <p className="text-xs text-[#7A746F] mt-0.5 max-w-xl">
                    Manage Dr. Mohammad Rubaiath Tashfin&apos;s qualifications, clinical certifications, awards, workshops, research publications, and verified Google Drive evidence records.
                  </p>
                </div>
              </div>

              <Link href="/achievements">
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5 text-xs h-9 shadow-2xs shrink-0"
                >
                  <span>Manage Achievements</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          <SmsGatewaySettingsSection />
        </div>
      </PageContainer>
    </AdminShell>
  );
}
