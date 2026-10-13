"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [mfaRequired, setMfaRequired] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpCode: mfaRequired ? totpCode.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Authentication failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (data?.mfaRequired) {
        setMfaRequired(true);
        setIsSubmitting(false);
        return;
      }

      const safeRedirect =
        redirectPath.startsWith("/") && !redirectPath.startsWith("//")
          ? redirectPath
          : "/";
      router.replace(safeRedirect);
      router.refresh();
    } catch {
      setError("Network error while connecting to authentication service.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FAF5EE] px-4 py-12 text-[#201C1A]">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Identity Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DE4F3C] text-white shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#201C1A]">
              Dr. Tashfin Clinical Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#7A746F]">
              Authorized Single-Clinician Patient & Prescription Management
            </p>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="rounded-2xl border border-[#EAE3D9] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#201C1A]">
                {mfaRequired
                  ? "Two-Factor Verification"
                  : "Clinician Sign In"}
              </h2>
              <p className="text-xs text-[#7A746F] mt-0.5">
                {mfaRequired
                  ? "Enter the 6-digit code from your authenticator app"
                  : "Enter your verified doctor credentials to continue"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
              {mfaRequired ? (
                <KeyRound className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </div>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaRequired ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="doctor-email">Clinician Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                    <Input
                      id="doctor-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="drtashfinahmed@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doctor-password">Password</Label>
                    <Link
                      href="/reset-password"
                      className="text-xs font-medium text-[#DE4F3C] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
                    <Input
                      id="doctor-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A746F] hover:text-[#201C1A]"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="totp-code">6-Digit Authenticator Code</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center font-mono text-lg tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setTotpCode("");
                    setError(null);
                  }}
                  className="text-xs text-[#7A746F] hover:text-[#201C1A] underline"
                >
                  Back to password sign-in
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full justify-center gap-2 h-10 mt-2"
            >
              <span>
                {isSubmitting
                  ? "Verifying Credentials..."
                  : mfaRequired
                  ? "Verify & Unlock Portal"
                  : "Sign In to Clinical Portal"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Security Footer Note */}
          <div className="pt-3 border-t border-[#EAE3D9] flex items-center gap-2.5 text-[11px] text-[#7A746F]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Protected by Row-Level Security (RLS), HttpOnly encrypted sessions,
              and brute-force rate limiting. Public registration is disabled.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF5EE] text-xs text-[#7A746F]">
          Loading clinical authentication portal...
        </div>
      }
    >
      <LoginFormContent />
    </React.Suspense>
  );
}
