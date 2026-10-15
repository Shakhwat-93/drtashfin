"use client";

import * as React from "react";
import { Send, AlertTriangle, CheckCircle2, Smartphone } from "lucide-react";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeBdPhoneNumber } from "@/lib/sms/phone-utils";

export interface TestSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TestSmsModal({ isOpen, onClose, onSuccess }: TestSmsModalProps) {
  const [phone, setPhone] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successResult, setSuccessResult] = React.useState<{
    message: string;
    phoneMasked: string;
    messageId?: string;
  } | null>(null);

  const handleClose = () => {
    setPhone("");
    setConfirmed(false);
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  const phoneValidation = normalizeBdPhoneNumber(phone);
  const isPhoneValid = phone.trim().length > 0 && phoneValidation.isValid;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || !confirmed) return;

    setIsSending(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await fetch("/api/settings/sms/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: phone.trim(),
          confirmation: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch test SMS");
      }

      setSuccessResult({
        message: data.message || "Test SMS accepted by provider.",
        phoneMasked: data.recipientPhoneMasked,
        messageId: data.providerMessageId,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error sending test SMS");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md">
      <form onSubmit={handleSendTest}>
        <ModalHeader>
          <div className="flex items-center gap-2 text-[#DE4F3C] mb-1">
            <Smartphone className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">SMS Gateway Test</span>
          </div>
          <ModalTitle>Send Test SMS</ModalTitle>
          <ModalDescription>
            Dispatch a test SMS via Bulk SMS Dhaka to verify outbound message delivery.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Provider charges warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Provider Charges Apply</span>
              <p className="text-[11px] text-amber-800 leading-normal">
                This action dispatches a real SMS message. Standard Bulk SMS Dhaka balance deductions apply. Never enter patient numbers for testing.
              </p>
            </div>
          </div>

          {/* Recipient Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Test Recipient Mobile Number <span className="text-rose-500">*</span>
            </label>
            <Input
              type="tel"
              placeholder="017XXXXXXXX or +8801XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSending || Boolean(successResult)}
              className="text-sm font-mono"
            />
            {phone.trim().length > 0 && !isPhoneValid && (
              <p className="text-[11px] text-rose-600">
                {phoneValidation.error || "Please enter a valid 11-digit Bangladesh mobile number."}
              </p>
            )}
            {phone.trim().length > 0 && isPhoneValid && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Valid {phoneValidation.operator} number ({phoneValidation.normalized})
              </p>
            )}
          </div>

          {/* Explicit Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/40 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={isSending || Boolean(successResult)}
              className="mt-0.5 rounded border-[#EAE3D9] text-[#DE4F3C] focus:ring-[#DE4F3C]/20"
            />
            <span className="text-xs text-[#201C1A] select-none">
              I confirm this is an authorized test recipient number and approve provider charges for this message.
            </span>
          </label>

          {/* Feedback: Error */}
          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Feedback: Success */}
          {successResult && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Test SMS Accepted
              </div>
              <p className="text-[11px] text-emerald-800">
                Delivered to: <span className="font-mono font-medium">{successResult.phoneMasked}</span>
              </p>
              {successResult.messageId && (
                <p className="text-[10px] text-emerald-700 font-mono">
                  Provider ID: {successResult.messageId}
                </p>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSending}
          >
            {successResult ? "Close" : "Cancel"}
          </Button>

          {!successResult && (
            <Button
              type="submit"
              variant="primary"
              disabled={!isPhoneValid || !confirmed || isSending}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              {isSending ? "Dispatching..." : "Send Test SMS"}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
