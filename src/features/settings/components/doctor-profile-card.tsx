"use client";

import * as React from "react";
import {
  User,
  GraduationCap,
  Building2,
  Globe2,
  Activity,
  ShieldCheck,
  Mail,
  BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OFFICIAL_DOCTOR_PROFILE } from "@/config/doctor-profile";

export function DoctorProfileCard() {
  const profile = OFFICIAL_DOCTOR_PROFILE;

  return (
    <Card className="overflow-hidden border border-[#EAE3D9] bg-white rounded-xl shadow-2xs">
      {/* Top Banner with Accent Pattern */}
      <div className="bg-gradient-to-r from-[#FAF5EE] via-[#FDF9F5] to-[#FAF5EE] border-b border-[#EAE3D9] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Doctor Avatar / Monogram */}
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-[#DE4F3C] text-white font-serif font-bold text-xl sm:text-2xl shadow-xs">
              RT
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#201C1A] tracking-tight">
                  {profile.fullName}
                </h2>
                <Badge variant="success" className="gap-1 text-[11px] font-medium py-0.5 px-2">
                  <BadgeCheck className="h-3 w-3" />
                  Verified Clinician
                </Badge>
              </div>

              {/* Bengali Name */}
              <p className="font-serif text-sm sm:text-base font-semibold text-[#DE4F3C]">
                {profile.bengaliName}
              </p>

              {/* Primary Designation Sub-banner */}
              <p className="text-xs sm:text-sm font-medium text-[#7A746F]">
                {profile.primaryDesignation}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1.5 text-xs text-[#7A746F]">
            <span className="font-mono text-[11px] bg-white px-2 py-1 rounded-md border border-[#EAE3D9]">
              ID: {profile.doctorCode}
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <Mail className="h-3 w-3 text-[#7A746F]" />
              <span className="truncate">{profile.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Clinical Credentials Grid */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#EAE3D9]/60 pb-2">
          <ShieldCheck className="h-4 w-4 text-[#DE4F3C]" />
          <span>Official Medical Credentials &amp; Practice Affiliation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Qualifications */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Academic Qualifications
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#201C1A]">
                {profile.qualifications}
              </p>
            </div>
          </div>

          {/* Primary Designation */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <User className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Primary Specialty &amp; Designation
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#201C1A]">
                {profile.primaryDesignation}
              </p>
            </div>
          </div>

          {/* Fellowship */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Fellowship
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#201C1A] leading-snug">
                {profile.fellowship}
              </p>
            </div>
          </div>

          {/* Additional Training */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <Activity className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Specialized Training
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#201C1A] leading-snug">
                {profile.additionalTraining}
              </p>
            </div>
          </div>

          {/* Workplace */}
          <div className="md:col-span-2 flex items-start gap-3 p-3.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#EAE3D9] text-[#DE4F3C] shadow-2xs">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Institutional Workplace &amp; Hospital Affiliation
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#201C1A]">
                {profile.workplace}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
