"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageSquare,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  RotateCcw,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { SmsReminder, SmsReminderStatus, SmsReminderType } from "@/types/sms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SmsRemindersPanelProps {
  followUpId?: string;
  patientId?: string;
  className?: string;
}

interface ProviderConfig {
  providerType: string;
  isLiveEnabled: boolean;
  configured: boolean;
  senderId?: string;
  supportedTimezone: string;
  message?: string;
}

export function SmsRemindersPanel({
  followUpId,
  patientId,
  className,
}: SmsRemindersPanelProps) {
  const [reminders, setReminders] = React.useState<SmsReminder[]>([]);
  const [config, setConfig] = React.useState<ProviderConfig | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessingQueue, setIsProcessingQueue] = React.useState(false);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const fetchConfig = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sms/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.warn("Failed to load SMS provider config:", e);
    }
  }, []);

  const fetchReminders = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (followUpId) params.set("followUpId", followUpId);
      if (patientId) params.set("patientId", patientId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("reminderType", typeFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/sms/reminders?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load SMS reminder logs");
      }
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching SMS records");
    } finally {
      setIsLoading(false);
    }
  }, [followUpId, patientId, statusFilter, typeFilter]);

  React.useEffect(() => {
    fetchConfig();
    fetchReminders();
  }, [fetchConfig, fetchReminders]);

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    setActionSuccess(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/sms/process-queue", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Queue processing failed");
      }
      setActionSuccess(
        `Queue processed: ${data.processed} evaluated, ${data.sent} sent, ${data.failed} failed.`
      );
      fetchReminders();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Queue trigger failed");
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleRetry = async (reminderId: string) => {
    setRetryingId(reminderId);
    setActionSuccess(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/sms/reminders/${reminderId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retry reminder");
      }
      setActionSuccess(data.message || "Retry dispatched successfully.");
      fetchReminders();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Banner: Provider Mode & Queue Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#EAE3D9] bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C]">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#201C1A]">SMS Provider Dispatch</span>
              {config ? (
                <Badge
                  variant={config.isLiveEnabled ? "success" : "warning"}
                  className="text-[10px] uppercase font-bold tracking-wider"
                >
                  <Radio className={cn("h-2.5 w-2.5 mr-1 inline", config.isLiveEnabled ? "text-emerald-500 animate-pulse" : "text-amber-500")} />
                  {config.isLiveEnabled ? "Live Dispatch" : "Safe Simulation (Mock)"}
                </Badge>
              ) : (
                <Skeleton className="h-4 w-20" />
              )}
            </div>
            <p className="text-[11px] text-[#7A746F]">
              Asia/Dhaka timezone (+06:00) &bull; Privacy preserved &bull; No diagnosis/meds included
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReminders}
            disabled={isLoading}
            leftIcon={<RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleProcessQueue}
            disabled={isProcessingQueue}
            leftIcon={<Send className={cn("h-3.5 w-3.5", isProcessingQueue && "animate-pulse")} />}
          >
            {isProcessingQueue ? "Processing..." : "Process Due Queue"}
          </Button>
        </div>
      </div>

      {/* Status Feedback Alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-rose-200 bg-rose-50 text-rose-800">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#EAE3D9]">
        <div className="flex items-center gap-1">
          {["all", "scheduled", "sent", "failed", "skipped", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer",
                statusFilter === st
                  ? "bg-[#201C1A] text-white"
                  : "bg-white text-[#7A746F] hover:bg-[#FAF5EE] hover:text-[#201C1A]"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#7A746F]">
          <span>Type:</span>
          {["all", "24h_before", "3h_before"].map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer",
                typeFilter === tp
                  ? "bg-[#DE4F3C] text-white font-bold"
                  : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:border-[#201C1A]"
              )}
            >
              {tp === "all" ? "All Types" : tp.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders Table / List */}
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`rem-skel-${idx}`} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-[#EAE3D9] bg-white text-[#7A746F] space-y-2">
          <MessageSquare className="h-6 w-6 mx-auto text-[#7A746F]/50" />
          <p className="text-xs font-medium">No SMS follow-up reminders found for this view.</p>
          <p className="text-[11px] text-[#7A746F]">
            Reminders are automatically generated when follow-ups are scheduled for opted-in patients.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE3D9] rounded-xl border border-[#EAE3D9] bg-white shadow-2xs overflow-hidden">
          {reminders.map((reminder) => {
            const isSent = reminder.status === "sent";
            const isFailed = reminder.status === "failed";
            const isSkipped = reminder.status === "skipped";
            const isScheduled = reminder.status === "scheduled" || reminder.status === "pending";
            const isCancelled = reminder.status === "cancelled";

            return (
              <div
                key={reminder.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF5EE]/30 transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-[#201C1A]">
                      {reminder.recipientPhoneMasked || reminder.recipientPhone}
                    </span>

                    <Badge
                      variant="neutral"
                      className="text-[10px] font-semibold uppercase tracking-wider bg-[#FAF5EE] text-[#59534E]"
                    >
                      {reminder.reminderType.replace("_", " ")}
                    </Badge>

                    {isSent && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline" />
                        Sent
                      </Badge>
                    )}

                    {isScheduled && (
                      <Badge variant="info" className="text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-1 inline" />
                        Scheduled
                      </Badge>
                    )}

                    {isFailed && (
                      <Badge variant="danger" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1 inline" />
                        Failed ({reminder.retryCount || 0} retries)
                      </Badge>
                    )}

                    {isSkipped && (
                      <Badge variant="warning" className="text-[10px]">
                        <Ban className="h-2.5 w-2.5 mr-1 inline" />
                        Skipped
                      </Badge>
                    )}

                    {isCancelled && (
                      <Badge variant="neutral" className="text-[10px]">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-[#59534E] font-mono line-clamp-1 bg-[#FAF5EE] px-2 py-1 rounded-md text-[11px]">
                    &ldquo;{reminder.messageContent}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7A746F]">
                    <span>
                      Target: {new Date(reminder.scheduledFor).toLocaleString()} (Dhaka)
                    </span>
                    {reminder.sentAt && (
                      <span>&bull; Sent: {new Date(reminder.sentAt).toLocaleTimeString()}</span>
                    )}
                    {reminder.providerMessageId && (
                      <span>&bull; ID: {reminder.providerMessageId}</span>
                    )}
                    {reminder.failureReason && (
                      <span className="text-rose-600 font-medium">
                        &bull; Reason: {reminder.failureReason}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {(isFailed || isSkipped) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(reminder.id)}
                      disabled={retryingId === reminder.id}
                      leftIcon={
                        <RotateCcw
                          className={cn("h-3 w-3", retryingId === reminder.id && "animate-spin")}
                        />
                      }
                      className="text-xs"
                    >
                      {retryingId === reminder.id ? "Sending..." : "Retry"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
