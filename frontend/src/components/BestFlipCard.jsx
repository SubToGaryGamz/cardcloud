import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Trophy, Award, Image as ImageIcon } from "lucide-react";
import { conditionLabel, CONDITION_IS_GRADED } from "../lib/conditions";

const RANGE_LABEL = { all: "All time", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last 12 months" };

export default function BestFlipCard({ since = "all", refreshKey }) {
  const [data, setData] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api.get("/cards/best-flip", { params: { since } });
        if (active) setData(r.data);
      } catch (e) { /* noop */ }
    })();
    return () => { active = false; };
  }, [since, refreshKey]);

  const card = data?.card;

  useEffect(() => {
    let revoked = false;
    let url = null;
    (async () => {
      if (!card?.image_path) { setImgUrl(null); return; }
      try {
        const res = await api.get(`/files/${card.image_path}`, { responseType: "blob" });
        url = URL.createObjectURL(res.data);
        if (!revoked) setImgUrl(url);
      } catch (e) { /* noop */ }
    })();
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
  }, [card?.image_path]);

  if (!card) return null;
  const profit = data?.profit ?? 0;

  return (
    <div className="rounded-lg bg-gradient-to-br from-[#FF3B30]/15 via-[#141414] to-[#141414] border border-[#FF3B30]/30 p-5 fade-up shadow-glow-red overflow-hidden relative" data-testid="best-flip-card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-[#FF3B30] grid place-items-center shrink-0">
            <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-[#FF8079] font-bold">Best Flip</div>
            <div className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold">{RANGE_LABEL[since] || "All time"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Profit</div>
          <div className={`font-display text-2xl lg:text-3xl tracking-tight font-black ${profit >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`} data-testid="best-flip-profit">
            {profit >= 0 ? "+" : "−"}${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0 h-24 w-[72px] rounded-md overflow-hidden bg-[#0A0A0A] border border-white/10">
          {imgUrl ? (
            <img src={imgUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-neutral-700"><ImageIcon className="h-7 w-7" strokeWidth={1.5} /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{card.year}{card.sport ? ` · ${card.sport}` : ""}</div>
          <h3 className="font-display text-xl lg:text-2xl font-black uppercase tracking-tight text-white leading-tight mt-0.5 line-clamp-2" data-testid="best-flip-name">{card.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] uppercase tracking-wider">
            {card.condition && (
              <span className="inline-flex items-center gap-1 bg-white/10 border border-white/10 text-white px-1.5 py-0.5 rounded-sm font-semibold">
                {CONDITION_IS_GRADED(card.condition) && <Award className="h-2.5 w-2.5" />}
                {conditionLabel(card)}
              </span>
            )}
            <span className="bg-white/5 border border-white/10 text-neutral-300 px-1.5 py-0.5 rounded-sm font-semibold">
              ${Number(card.price_paid || 0).toFixed(0)} → ${Number(card.price_sold || 0).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
