import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { DollarSign, Zap } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function QuickSellModal({ open, onClose, card, onDone }) {
  const today = new Date().toISOString().slice(0, 10);
  const [soldPrice, setSoldPrice] = useState("");
  const [extraFees, setExtraFees] = useState("");
  const [soldDate, setSoldDate] = useState(today);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSoldPrice("");
      setExtraFees("");
      setSoldDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, card]);

  if (!card) return null;

  const priceNum = parseFloat(soldPrice || 0) || 0;
  const extraNum = parseFloat(extraFees || 0) || 0;
  const projectedProfit = priceNum - Number(card.price_paid || 0) - Number(card.expenses || 0) - extraNum;
  const positive = projectedProfit >= 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!soldPrice) {
      toast.error("Enter the sold price");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/cards/${card.id}/quick-sell`, {
        price_sold: priceNum,
        extra_expenses: extraNum,
        sold_date: soldDate || null,
      });
      toast.success(`Sold! ${positive ? "+" : "−"}$${Math.abs(projectedProfit).toFixed(2)} profit`);
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Quick sell failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-md" data-testid="quick-sell-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight font-black uppercase flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FF3B30]" /> Quick Sell
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-white/10 bg-black/40 p-3 mb-2">
          <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{card.year}</div>
          <div className="font-display text-lg font-bold uppercase tracking-tight line-clamp-1">{card.name}</div>
          <div className="mt-1 text-xs text-neutral-400">
            Paid <span className="text-white font-semibold">${Number(card.price_paid || 0).toFixed(2)}</span>
            {Number(card.expenses || 0) > 0 && (
              <> · Existing fees <span className="text-white font-semibold">${Number(card.expenses).toFixed(2)}</span></>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">Sold For ($)</Label>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input autoFocus type="number" step="0.01" min="0" required value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="0.00"
                className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="quick-sell-price-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Extra Fees ($)</Label>
              <Input type="number" step="0.01" min="0" value={extraFees}
                onChange={(e) => setExtraFees(e.target.value)}
                placeholder="0.00"
                className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="quick-sell-fees-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Sold Date</Label>
              <Input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)}
                className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="quick-sell-date-input" />
            </div>
          </div>

          <div className={`rounded-md border p-3 ${positive ? "border-[#34C759]/30 bg-[#34C759]/5" : "border-[#FF3B30]/30 bg-[#FF3B30]/5"}`}>
            <div className="text-xs tracking-widest uppercase text-neutral-400">Projected Profit</div>
            <div className={`font-display text-2xl font-black tracking-tight ${positive ? "text-[#34C759]" : "text-[#FF3B30]"}`} data-testid="quick-sell-projected-profit">
              {positive ? "+" : "−"}${Math.abs(projectedProfit).toFixed(2)}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="quick-sell-cancel">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="quick-sell-submit">
              {busy ? "Selling…" : "Mark as Sold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
