"use client";

import * as React from "react";
import Link from "next/link";
import { User, Eye, Edit2, Plus, Users } from "lucide-react";
import { Patient } from "@/types/patient";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface PatientListTableProps {
  patients: Patient[];
  isLoading?: boolean;
  hasFilter?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

export function PatientListTable({
  patients,
  isLoading = false,
  hasFilter = false,
  onResetFilters,
  className,
}: PatientListTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#EAE3D9] bg-white p-4 shadow-xs">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-[#EAE3D9]/60 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-4 w-16 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    if (hasFilter) {
      return (
        <EmptyState
          icon={Users}
          title="No patients match your search"
          description="Try changing the keywords or clearing gender filters to find patient records."
          action={
            onResetFilters && (
              <Button variant="outline" size="sm" onClick={onResetFilters}>
                Clear Search & Filters
              </Button>
            )
          }
        />
      );
    }

    return (
      <EmptyState
        icon={User}
        title="No patients registered yet"
        description="Get started by registering your first patient to maintain clinical histories, consultations, and prescriptions."
        action={
          <Link href="/patients/new">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Register Patient</span>
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Table responsive="stack" className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Patient ID</TableHead>
          <TableHead>Patient Details</TableHead>
          <TableHead>Age / Gender</TableHead>
          <TableHead>Blood & Weight</TableHead>
          <TableHead>Contact Phone</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => {
          const formattedDate = new Date(patient.createdAt).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          );

          return (
            <TableRow key={patient.id}>
              {/* Patient ID */}
              <TableCell label="Patient ID">
                <Badge
                  variant="neutral"
                  size="sm"
                  className="font-mono font-semibold"
                >
                  {patient.patientId}
                </Badge>
              </TableCell>

              {/* Name & Subtitle */}
              <TableCell label="Patient Details">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C] font-semibold text-xs">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <Link
                      href={`/patients/${patient.patientId}`}
                      className="font-medium text-xs text-[#201C1A] hover:text-[#DE4F3C] transition-colors truncate"
                    >
                      {patient.name}
                    </Link>
                    <span className="text-[11px] text-[#7A746F]">
                      Registered {formattedDate}
                    </span>
                  </div>
                </div>
              </TableCell>

              {/* Age & Gender */}
              <TableCell label="Age / Gender">
                <div className="text-xs text-[#201C1A]">
                  <span>{patient.age} yrs</span>
                  <span className="text-[#7A746F] capitalize">
                    {" "}
                    • {patient.gender}
                  </span>
                </div>
              </TableCell>

              {/* Blood & Weight */}
              <TableCell label="Blood & Weight">
                <div className="flex items-center gap-1.5 text-xs text-[#201C1A]">
                  {patient.bloodGroup ? (
                    <Badge variant="primary" size="sm">
                      {patient.bloodGroup}
                    </Badge>
                  ) : (
                    <span className="text-[#7A746F]">-</span>
                  )}
                  {patient.weight ? (
                    <span className="text-[#7A746F] text-[11px]">
                      {patient.weight} kg
                    </span>
                  ) : null}
                </div>
              </TableCell>

              {/* Phone */}
              <TableCell label="Contact Phone">
                <span className="text-xs text-[#201C1A]">
                  {patient.phone || <span className="text-[#7A746F]">-</span>}
                </span>
              </TableCell>

              {/* Quick Actions */}
              <TableCell label="Actions" className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Link href={`/patients/${patient.patientId}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-[#201C1A] hover:text-[#DE4F3C]"
                      title="View Profile"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>View</span>
                    </Button>
                  </Link>

                  <Link href={`/patients/${patient.patientId}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-[#7A746F] hover:text-[#201C1A]"
                      title="Edit Patient"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
