"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  KeyRound,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken =
    searchParams.get("token_hash") || searchParams.get("token") || "";

  const [mode, setMode] = React.useState<"request" | "confirm">(
    initialToken ? "confirm" : "request"
  );
  const [email, setEmail] = React.useState("");
  const [tokenHash, setTokenHash] = React.useState(initialToken);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_reset",
          email: email.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Unable to process recovery request.");
      } else {
        setSuccessMessage(
          data?.message ||
            "If the email matches the authorized clinician account, a recovery token has been issued."
        );
      }
    } catch {
      setError("Network error while requesting password recovery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_reset",
          tokenHash: tokenHash.trim(),
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Recovery token verification failed.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Password updated. Redirecting to clinical portal...");
      setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 1200);
    } catch {
      setError("Network error while resetting password.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FAF5EE] px-4 py-12 text-[#201C1A]">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DE4F3C] text-white shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#201C1A]">
              Clinician Password Recovery
            </h1>
            <p className="text-xs text-[#7A746F]">
              Verified credential recovery for Dr. Tashfin Clinical Portal
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE3D9] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex gap-2 p-1 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9]">
            <button
              type="button"
              onClick={() => {
                setMode("request");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === "request"
                  ? "bg-white text-[#201C1A] shadow-2xs font-semibold"
                  : "text-[#7A746F] hover:text-[#201C1A]"
              }`}
            >
              1. Request Recovery
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("confirm");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === "confirm"
                  ? "bg-white text-[#201C1A] shadow-2xs font-semibold"
                  : "text-[#7A746F] hover:text-[#201C1A]"
              }`}
            >
              2. Verify Token & Reset
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === "request" ? (
            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Authorized Doctor Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                  <Input
                    id="recovery-email"
                    type="email"
                    required
                    placeholder="drtashfinahmed@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full justify-center h-10"
              >
                {isSubmitting
                  ? "Sending Recovery Request..."
                  : "Send Recovery Instructions"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmRecovery} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-token">Recovery Token Hash</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                  <Input
                    id="recovery-token"
                    type="text"
                    required
                    placeholder="Paste recovery token hash"
                    value={tokenHash}
                    onChange={(e) => setTokenHash(e.target.value)}
                    className="pl-9 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">
                  New Password (min 10 chars, upper, lower, number)
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={10}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={10}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full justify-center h-10"
              >
                {isSubmitting
                  ? "Verifying & Updating..."
                  : "Verify Token & Set New Password"}
              </Button>
            </form>
          )}

          <div className="pt-3 border-t border-[#EAE3D9] flex items-center justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF5EE] text-xs text-[#7A746F]">
          Loading password recovery...
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
