"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  ShieldCheck,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui/dropdown";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Label,
  Badge,
} from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { ChamberSelector } from "@/features/chamber";

export interface HeaderProps {
  onMenuClick?: () => void;
}

interface DoctorSessionUser {
  id: string;
  email: string;
  doctorCode: string;
  fullName: string;
  specialty: string;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [doctorUser, setDoctorUser] = React.useState<DoctorSessionUser>({
    id: "",
    email: "drtashfinahmed@gmail.com",
    doctorCode: "dr-tashfin",
    fullName: "Dr. Tashfin Ahmed",
    specialty: "Cardiology & Medicine",
  });
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = React.useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [securityError, setSecurityError] = React.useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = React.useState<string | null>(
    null
  );
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // MFA Enrollment State
  const [mfaQrSvg, setMfaQrSvg] = React.useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = React.useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = React.useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = React.useState("");
  const [isEnrollingMfa, setIsEnrollingMfa] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session")
      .then(async (res) => {
        if (!mounted) return;
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.authenticated && data?.user) {
          setDoctorUser(data.user);
          setMfaEnabled(Boolean(data.mfaEnabled));
        }
      })
      .catch(() => {
        // Offline or local test fallback
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut().catch(() => {});
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (newPassword !== confirmPassword) {
      setSecurityError("New password and confirmation do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSecurityError(data?.error || "Failed to update password.");
      } else {
        setSecuritySuccess("Password updated and session rotated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setSecurityError("Network error while updating password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleStartMfaEnroll = async () => {
    setSecurityError(null);
    setSecuritySuccess(null);
    setIsEnrollingMfa(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSecurityError(data?.error || "Could not start MFA enrollment.");
      } else if (data?.totp) {
        setMfaFactorId(data.factorId);
        setMfaQrSvg(data.totp.qr_code);
        setMfaSecret(data.totp.secret);
      }
    } catch {
      setSecurityError("Network error while enrolling MFA.");
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const handleVerifyMfaEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !mfaVerifyCode) return;
    setSecurityError(null);
    setSecuritySuccess(null);
    setIsEnrollingMfa(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          factorId: mfaFactorId,
          code: mfaVerifyCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSecurityError(data?.error || "Invalid authenticator code.");
      } else {
        setMfaEnabled(true);
        setMfaQrSvg(null);
        setMfaSecret(null);
        setMfaVerifyCode("");
        setSecuritySuccess("Two-factor authentication (TOTP) is now active.");
      }
    } catch {
      setSecurityError("Network error verifying MFA code.");
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#EAE3D9] bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
        {/* Left: Mobile Trigger & Contextual Date */}
        <div className="flex items-center gap-3">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            className="lg:hidden text-[#201C1A]"
          >
            <Menu className="h-5 w-5" />
          </IconButton>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#7A746F]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{currentDate}</span>
            <span className="text-[#EAE3D9]">•</span>
            <span>Main Chamber</span>
          </div>
        </div>

        {/* Center/Left: Global Patient Search */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 min-w-0">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7A746F]">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="search"
              readOnly
              onClick={() => router.push("/patients")}
              placeholder="Search patients..."
              className="w-full h-9 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/70 pl-9 pr-4 text-xs text-[#201C1A] placeholder:text-[#7A746F] focus:outline-hidden focus:border-[#DE4F3C] focus:bg-white transition-all cursor-pointer"
            />
            <div className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-[#EAE3D9] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right: Notifications & Doctor Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Practice Chamber Selector */}
          <ChamberSelector variant="header" />

          <div className="relative">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="View notifications"
              className="text-[#7A746F] hover:text-[#201C1A]"
            >
              <Bell className="h-4 w-4" />
            </IconButton>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#DE4F3C] ring-2 ring-white" />
          </div>

          <div className="h-5 w-[1px] bg-[#EAE3D9] mx-0.5 hidden sm:block" />

          {/* Authenticated Doctor Profile Dropdown */}
          <Dropdown>
            <DropdownTrigger>
              <div className="flex items-center gap-2.5 pl-1.5 py-1 pr-2 rounded-lg hover:bg-[#FAF5EE] transition-colors border border-transparent hover:border-[#EAE3D9]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9EFE5] border border-[#EAE3D9] text-[#DE4F3C] font-serif font-semibold text-xs">
                  DT
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#201C1A] leading-tight">
                    {doctorUser.fullName}
                  </span>
                  <span className="text-[10px] text-[#7A746F]">
                    {doctorUser.specialty}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#7A746F] hidden md:block" />
              </div>
            </DropdownTrigger>
            <DropdownContent align="right" className="w-60">
              <div className="px-3 py-2.5 border-b border-[#EAE3D9]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#201C1A]">
                    {doctorUser.fullName}
                  </p>
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    Verified
                  </Badge>
                </div>
                <p className="text-[10px] text-[#7A746F] truncate mt-0.5">
                  {doctorUser.email}
                </p>
              </div>
              <DropdownItem
                onClick={() => {
                  setSecurityError(null);
                  setSecuritySuccess(null);
                  setIsSecurityModalOpen(true);
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#7A746F]" />
                Security, Password & MFA
              </DropdownItem>
              <DropdownItem
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                Sign Out Securely
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>

      {/* Doctor Security, Password & MFA Modal */}
      <Modal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      >
        <ModalHeader>
          <ModalTitle>Clinician Security & Access Settings</ModalTitle>
          <ModalDescription>
            Manage your password and Two-Factor Authentication (TOTP) for{" "}
            {doctorUser.email}.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-6">
          {securityError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{securityError}</span>
            </div>
          )}
          {securitySuccess && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{securitySuccess}</span>
            </div>
          )}

          {/* Section 1: Password Rotation */}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
              Change Clinician Password
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="sec-current-password">Current Password</Label>
              <Input
                id="sec-current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sec-new-password">New Password</Label>
                <Input
                  id="sec-new-password"
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 10 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-confirm-password">Confirm Password</Label>
                <Input
                  id="sec-confirm-password"
                  type="password"
                  required
                  minLength={10}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>

          {/* Section 2: TOTP Multi-Factor Authentication */}
          <div className="pt-4 border-t border-[#EAE3D9] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                  Authenticator App (TOTP MFA)
                </h3>
                <p className="text-xs text-[#7A746F] mt-0.5">
                  Optional second-factor protection for clinical login
                </p>
              </div>
              <Badge variant={mfaEnabled ? "success" : "neutral"}>
                {mfaEnabled ? "Active" : "Not Enrolled"}
              </Badge>
            </div>

            {!mfaEnabled && !mfaQrSvg && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isEnrollingMfa}
                onClick={handleStartMfaEnroll}
                className="gap-2"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>
                  {isEnrollingMfa
                    ? "Generating Secret..."
                    : "Configure Authenticator App"}
                </span>
              </Button>
            )}

            {mfaQrSvg && (
              <form
                onSubmit={handleVerifyMfaEnroll}
                className="rounded-xl border border-[#EAE3D9] bg-[#FAF5EE] p-4 space-y-3"
              >
                <p className="text-xs text-[#201C1A]">
                  Scan this QR code in Google Authenticator, Authy, or 1Password,
                  then enter the 6-digit code below:
                </p>
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-[#EAE3D9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mfaQrSvg}
                    alt="TOTP QR Code"
                    className="h-36 w-36"
                  />
                  {mfaSecret && (
                    <p className="text-[11px] font-mono text-[#7A746F] select-all">
                      Secret: {mfaSecret}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    placeholder="6-digit code"
                    value={mfaVerifyCode}
                    onChange={(e) =>
                      setMfaVerifyCode(e.target.value.replace(/\D/g, ""))
                    }
                    className="font-mono text-center tracking-widest"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isEnrollingMfa}
                  >
                    Activate
                  </Button>
                </div>
              </form>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSecurityModalOpen(false)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
