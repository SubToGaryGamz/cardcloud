import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sparkles, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useBilling } from "../context/BillingContext";

/**
 * Pre-checkout dialog: gives the user a chance to enter a beta invite code
 * (instant Pro access) before they get sent to Stripe Checkout.
 *
 * Props:
 *   open, onClose       — modal control
 *   onContinueToCheckout(packageId) — called when user picks "Continue" instead of redeeming
 *   defaultPackageId    — "pro_monthly" or "pro_yearly"; passed back if user opts for paid path
 *   priceLabel          — string shown on the Continue button (e.g. "$6/mo with 7-day trial")
 */
export default function BetaCodeDialog({
  open,
  onClose,
  onContinueToCheckout,
  defaultPackageId = "pro_monthly",
  priceLabel = "Start 7-day free trial",
}) {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const { refresh } = useBilling();

  useEffect(() => { if (!open) setCode(""); }, [open]);

  const onRedeem = async (e) => {
    e?.preventDefault?.();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const r = await api.post("/billing/redeem-code", { code: code.trim() });
      toast.success(`Beta unlocked · ${r.data.days_granted} days of Pro 🎉`);
      await refresh();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#141414] border border-white/10 max-w-md" data-testid="beta-code-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tighter font-black uppercase">Almost there</DialogTitle>
        </DialogHeader>

        <form onSubmit={onRedeem} className="space-y-5 mt-2">
          <div className="rounded-md border border-[#FFD60A]/30 bg-[#FFD60A]/5 p-3.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#FFD60A] font-black">
              <KeyRound className="h-3 w-3" /> Beta tester?
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Enter your invite code below for instant Pro access — no payment required.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter beta code"
                className="bg-[#0A0A0A] border-white/10 text-white uppercase tracking-widest font-bold placeholder:text-neutral-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                autoFocus
                data-testid="beta-code-input"
              />
              <Button
                type="submit"
                disabled={!code.trim() || redeeming}
                className="bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black font-bold uppercase tracking-wide shrink-0"
                data-testid="beta-code-redeem-button"
              >
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </div>

          <div className="relative flex items-center my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Button
            type="button"
            onClick={() => { onContinueToCheckout(defaultPackageId); }}
            className="w-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red h-auto py-3"
            data-testid="beta-dialog-continue-button"
          >
            <Sparkles className="h-4 w-4 mr-2" /> {priceLabel}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-[11px] uppercase tracking-widest text-neutral-500 hover:text-white font-semibold transition py-1"
            data-testid="beta-dialog-cancel-button"
          >
            Cancel
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
