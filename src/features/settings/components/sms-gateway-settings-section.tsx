"use client";

import * as React from "react";
import {
  MessageSquare,
  Key,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Coins,
  ExternalLink,
  Lock,
  Globe,
} from "lucide-react";
import { SmsGatewayPublicConfig, ValidateGatewayResult } from "@/types/sms-gateway";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TestSmsModal } from "./test-sms-modal";

export function SmsGatewaySettingsSection() {
  const [config, setConfig] = React.useState<SmsGatewayPublicConfig | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = React.useState(false);

  // Form State
  const [isReplacingKey, setIsReplacingKey] = React.useState(false);
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [callerId, setCallerId] = React.useState("1234");
  const [isEnabled, setIsEnabled] = React.useState(false);

  // Feedback State
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState<string | null>(null);
  const [validationResult, setValidationResult] = React.useState<ValidateGatewayResult | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const refreshConfig = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings/sms");
      if (res.ok) {
        const data: SmsGatewayPublicConfig = await res.json();
        setConfig(data);
        setCallerId(data.callerId || "1234");
        setIsEnabled(data.isEnabled);
      }
    } catch (e) {
      console.warn("Failed to refresh config:", e);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const loadInitialConfig = async () => {
      try {
        const res = await fetch("/api/settings/sms");
        if (!res.ok) {
          throw new Error("Failed to load SMS gateway settings");
        }
        const data: SmsGatewayPublicConfig = await res.json();
        if (isMounted) {
          setConfig(data);
          setCallerId(data.callerId || "1234");
          setIsEnabled(data.isEnabled);
          setIsReplacingKey(!data.hasApiKey);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : "Error loading settings");
          setIsLoading(false);
        }
      }
    };

    loadInitialConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: Record<string, unknown> = {
        callerId: callerId.trim() || "1234",
        isEnabled,
      };

      if (isReplacingKey && apiKeyInput.trim().length > 0) {
        payload.apiKey = apiKeyInput.trim();
      }

      const res = await fetch("/api/settings/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setConfig(data.config);
      setApiKeyInput("");
      setIsReplacingKey(false);
      setSaveSuccessMsg("SMS gateway configuration saved securely. Credentials encrypted at rest.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateConnection = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch("/api/settings/sms/validate", {
        method: "POST",
      });

      const data: ValidateGatewayResult = await res.json();
      setValidationResult(data);

      if (data.success) {
        refreshConfig();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Connection validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const isLiveActive = config?.isEnabled && config?.hasApiKey;

  return (
    <Card className="border-[#EAE3D9] bg-white shadow-xs overflow-hidden">
      {/* Card Header */}
      <CardHeader className="border-b border-[#EAE3D9]/70 pb-5 bg-gradient-to-b from-[#FAF5EE]/40 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
                <MessageSquare className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[#201C1A]">
                SMS Gateway Settings
              </CardTitle>
              <Badge variant="neutral" className="text-[10px] uppercase font-bold tracking-wider">
                Bulk SMS Dhaka
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#7A746F]">
              Configure your Bulk SMS Dhaka API credentials, sender identity, and live reminder dispatching.
            </CardDescription>
          </div>

          {/* Gateway Live Status Indicator */}
          <div className="flex items-center gap-2">
            {isLiveActive ? (
              <Badge variant="success" className="px-3 py-1 text-xs">
                <Radio className="h-2.5 w-2.5 mr-1.5 text-emerald-500 animate-pulse" />
                Live Dispatch Active
              </Badge>
            ) : config?.hasApiKey ? (
              <Badge variant="warning" className="px-3 py-1 text-xs">
                <Radio className="h-2.5 w-2.5 mr-1.5 text-amber-500" />
                Simulation (Disabled)
              </Badge>
            ) : (
              <Badge variant="danger" className="px-3 py-1 text-xs">
                <AlertTriangle className="h-2.5 w-2.5 mr-1.5 text-rose-500" />
                Key Not Configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Status Alerts */}
        {saveSuccessMsg && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {validationResult && (
          <div
            className={cn(
              "flex items-start gap-2.5 p-3.5 text-xs rounded-xl border animate-in fade-in",
              validationResult.success
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                : "border-rose-200 bg-rose-50/80 text-rose-900"
            )}
          >
            {validationResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="font-semibold">{validationResult.status}</span>
              <p className="text-[11px] leading-relaxed">{validationResult.message}</p>
              {validationResult.balance && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[11px] font-mono font-medium">
                  <Coins className="h-3 w-3" />
                  Remaining Balance: {validationResult.balance} BDT
                </div>
              )}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 text-xs rounded-xl border border-rose-200 bg-rose-50 text-rose-800 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Provider Overview Box */}
          <div className="p-4 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#7A746F]" />
                <span className="text-xs font-semibold text-[#201C1A]">SMS Provider</span>
              </div>
              <a
                href="https://bulksmsdhaka.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#DE4F3C] hover:underline inline-flex items-center gap-1 font-medium"
              >
                Bulk SMS Dhaka Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#7A746F] leading-relaxed">
              Dr. Tashfin Patient Care uses Bulk SMS Dhaka for automated appointment follow-up reminders. All requests use server-to-server POST with encrypted parameters in the Asia/Dhaka (+06:00) timezone.
            </p>
          </div>

          {/* API Key Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#7A746F]" />
                API Key <span className="text-rose-500">*</span>
              </label>
              {config?.hasApiKey && !isReplacingKey && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplacingKey(true);
                    setApiKeyInput("");
                  }}
                  className="text-xs text-[#DE4F3C] font-semibold hover:underline cursor-pointer"
                >
                  Replace API Key
                </button>
              )}
              {config?.hasApiKey && isReplacingKey && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplacingKey(false);
                    setApiKeyInput("");
                  }}
                  className="text-xs text-[#7A746F] hover:underline cursor-pointer"
                >
                  Cancel Replacement
                </button>
              )}
            </div>

            {config?.hasApiKey && !isReplacingKey ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/50 text-xs">
                <div className="flex items-center gap-2 font-mono text-[#59534E]">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{config.maskedApiKey || "••••••••••••"}</span>
                </div>
                <Badge variant="neutral" className="text-[10px] text-[#7A746F] bg-white">
                  Encrypted at Rest (AES-256-GCM)
                </Badge>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter your Bulk SMS Dhaka API Key"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    disabled={isSaving}
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A746F] hover:text-[#201C1A]"
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#7A746F]">
                  Obtain your API Key from your Bulk SMS Dhaka Account Dashboard under API Settings.
                </p>
              </div>
            )}
          </div>

          {/* Caller ID / Sender ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Caller ID / Sender ID
            </label>
            <Input
              type="text"
              placeholder="e.g. 1234 or approved Brand Name"
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              disabled={isSaving}
              className="text-sm font-mono max-w-sm"
            />
            <p className="text-[11px] text-[#7A746F]">
              Default is <code className="bg-[#FAF5EE] px-1 py-0.5 rounded text-[10px]">1234</code> for numeric sender ID. If using a custom brand masking ID, ensure it is approved in your Bulk SMS Dhaka portal.
            </p>
          </div>

          {/* Live Dispatch Toggle */}
          <div className="p-4 rounded-xl border border-[#EAE3D9] bg-white space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                disabled={isSaving}
                className="mt-0.5 h-4 w-4 rounded border-[#EAE3D9] text-[#DE4F3C] focus:ring-[#DE4F3C]/20"
              />
              <div className="space-y-0.5 select-none">
                <span className="text-xs font-bold text-[#201C1A]">
                  Enable Live SMS Reminder Dispatch
                </span>
                <p className="text-[11px] text-[#7A746F] leading-normal">
                  When enabled, queued follow-up reminders will be sent to opted-in patients via Bulk SMS Dhaka. Keep disabled during testing or simulation.
                </p>
              </div>
            </label>
          </div>

          {/* Metadata & Last Verification Status */}
          {config?.lastTestedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-[#EAE3D9]/60 bg-[#FAF5EE]/30 text-[11px] text-[#7A746F]">
              <span>
                Last Tested: {new Date(config.lastTestedAt).toLocaleString()} (Dhaka)
              </span>
              {config.lastBalance && (
                <span className="font-semibold text-emerald-700">
                  Account Balance: {config.lastBalance} BDT
                </span>
              )}
              {config.lastTestStatus && (
                <span className="text-[#59534E]">
                  Status: {config.lastTestStatus}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EAE3D9]">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidateConnection}
                disabled={isValidating || !config?.hasApiKey}
                leftIcon={<RefreshCw className={cn("h-3.5 w-3.5", isValidating && "animate-spin")} />}
                title="Verify credentials without sending SMS or incurring charges"
              >
                {isValidating ? "Validating..." : "Validate Connection"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsTestModalOpen(true)}
                disabled={!config?.hasApiKey}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Send Test SMS
              </Button>
            </div>
          </div>
        </form>

        {/* IP Whitelisting Advisory Box */}
        <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 text-sky-950 text-xs space-y-1">
          <span className="font-semibold flex items-center gap-1.5 text-sky-900">
            <Globe className="h-3.5 w-3.5" />
            Bulk SMS Dhaka IP Whitelisting Information
          </span>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            If connection validation returns error <code className="font-mono bg-sky-100 px-1 py-0.5 rounded">1008 (IP Not Whitelisted)</code>, log in to your Bulk SMS Dhaka portal and add your production server outgoing IP:
          </p>
          <div className="font-mono font-bold text-xs bg-white px-2.5 py-1.5 rounded border border-sky-200 inline-block text-[#201C1A]">
            72.60.108.65
          </div>
          <p className="text-[10px] text-sky-700">
            Path in portal: <strong>Account &rarr; API Settings &rarr; IP Whitelist</strong>
          </p>
        </div>
      </CardContent>

      {/* Test SMS Modal */}
      <TestSmsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSuccess={() => {
          refreshConfig();
        }}
      />
    </Card>
  );
}
