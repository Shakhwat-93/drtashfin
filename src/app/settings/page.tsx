"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SmsGatewaySettingsSection } from "@/features/settings";
import { Sliders, ShieldCheck } from "lucide-react";

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
          <SmsGatewaySettingsSection />
        </div>
      </PageContainer>
    </AdminShell>
  );
}
