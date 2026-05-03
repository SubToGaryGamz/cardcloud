import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Sparkles, Download, Loader2, Trophy, TrendingUp, ShoppingBag, Layers } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

/**
 * Year-in-Review shareable card.
 * - Renders a polished 1080x1350 IG-Stories-friendly visual.
 * - User can click "Download" to save as PNG (uses html-to-image via canvas snapshot).
 * - Stats fetched from /api/me/year-recap.
 */
export default function YearInReviewModal({ open, onClose, defaultYear }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year] = useState(defaultYear ?? new Date().getFullYear());
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(`/me/year-recap?year=${year}`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Couldn't load your recap"))
      .finally(() => setLoading(false));
  }, [open, year]);

  const onDownload = async () => {
    if (!cardRef.current) return;
    try {
      // Lazy-load html-to-image only when the user actually downloads (keeps bundle small)
      const mod = await import("html-to-image");
      const dataUrl = await mod.toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0A0A0A" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `cardcloud-${year}-recap.png`;
      a.click();
      toast.success("Downloaded · share it on IG / X / TikTok");
    } catch (e) {
      toast.error("Couldn't generate image");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#141414] border border-white/10 max-w-2xl p-0 overflow-hidden" data-testid="year-recap-modal">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl tracking-tighter font-black uppercase">
            <Sparkles className="inline h-5 w-5 text-[#FFD60A] mr-2" /> Your {year} CardCloud Recap
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {loading || !data ? (
            <div className="h-72 grid place-items-center text-neutral-500 font-display tracking-widest uppercase text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> Crunching your year…
            </div>
          ) : (
            <>
              {/* The shareable card — fixed 4:5 aspect for IG Stories */}
              <div
                ref={cardRef}
                className="relative mx-auto w-full max-w-md aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0A0A0A] via-[#1a0a08] to-[#0A0A0A] border border-white/10"
                data-testid="year-recap-canvas"
              >
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#FF3B30]/30 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[#FFD60A]/15 blur-3xl pointer-events-none" />

                <div className="relative h-full p-6 sm:p-8 flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center">
                      <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-display text-sm tracking-tight font-black uppercase text-white">CardCloud</span>
                    <span className="ml-auto text-[10px] uppercase tracking-[0.25em] font-bold text-neutral-500">{year} Recap</span>
                  </div>

                  <div className="mt-6">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-[#FFD60A]">Total profit</div>
                    <div className={`font-display tracking-tighter font-black leading-none mt-1 ${data.total_profit >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}
                         style={{ fontSize: "clamp(48px, 11vw, 88px)" }}>
                      {data.total_profit >= 0 ? "+" : ""}${Math.abs(data.total_profit).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: "Flips", value: data.flips, icon: TrendingUp },
                      { label: "Cards added", value: data.cards_added, icon: Layers },
                      { label: "Total spend", value: `$${data.spend.toLocaleString()}`, icon: ShoppingBag },
                    ].map((m) => (
                      <div key={m.label} className="rounded-md bg-white/5 border border-white/10 p-2.5">
                        <m.icon className="h-3.5 w-3.5 text-neutral-400" />
                        <div className="font-display text-lg sm:text-xl tracking-tighter font-black text-white mt-1 leading-tight">{m.value}</div>
                        <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {data.best_flip && (
                    <div className="mt-5 rounded-md border border-[#FFD60A]/30 bg-[#FFD60A]/5 p-3 flex items-start gap-3">
                      <Trophy className="h-4 w-4 text-[#FFD60A] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.25em] font-black text-[#FFD60A]">MVP Flip</div>
                        <div className="font-display text-sm font-black uppercase tracking-tight text-white truncate mt-0.5">
                          {data.best_flip.year ? `${data.best_flip.year} ` : ""}{data.best_flip.name}
                        </div>
                        <div className="text-xs text-[#34C759] font-bold mt-0.5">+${data.best_flip.profit.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-5 flex items-end justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Top Sport</div>
                      <div className="font-display text-base font-black uppercase tracking-tight text-white mt-0.5">{data.top_sport || "—"}</div>
                    </div>
                    <div className="text-right text-[9px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Track yours<br /><span className="text-white">cardcloud.app</span></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={onDownload} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red" data-testid="year-recap-download">
                  <Download className="h-4 w-4 mr-2" /> Download PNG
                </Button>
                <Button onClick={onClose} variant="outline" className="bg-transparent border-white/15 text-white hover:bg-white/5">
                  Done
                </Button>
              </div>
              <p className="text-center text-[11px] uppercase tracking-widest text-neutral-500">
                Save the image · share to IG Stories, X, TikTok, Discord
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
