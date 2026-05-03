import React, { useEffect, useState } from "react";
import { Target, Sparkles, Pencil, Check, X } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function MonthlyGoalTile({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/me/monthly-progress");
      setData(r.data);
    } catch (e) { /* will retry on refreshKey */ }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [refreshKey]);

  const save = async () => {
    const n = draft.trim() === "" ? null : Math.max(0, Number(draft));
    if (n !== null && Number.isNaN(n)) { toast.error("Enter a number"); return; }
    setSaving(true);
    try {
      await api.put("/me/goal", { monthly_profit_goal: n });
      toast.success(n ? `Goal set: $${n.toLocaleString()} this month` : "Goal cleared");
      setEditing(false);
      load();
    } catch (e) { toast.error("Couldn't save goal"); }
    finally { setSaving(false); }
  };

  if (!data) return null;
  const pct = Math.min(1, Math.max(0, data.pct || 0));
  const hit = pct >= 1;
  const profitColor = data.profit >= 0 ? "text-[#34C759]" : "text-[#FF3B30]";

  return (
    <div className="card-tile rounded-lg bg-gradient-to-br from-[#141414] to-[#0c0c0c] border border-white/10 p-5 sm:p-6 flex flex-col" data-testid="monthly-goal-tile">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-black text-neutral-400">
          <Target className="h-3.5 w-3.5 text-[#FF3B30]" /> {data.month} · Goal
        </div>
        {!editing && (
          <button onClick={() => { setDraft(data.goal != null ? String(data.goal) : ""); setEditing(true); }} className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition flex items-center gap-1" data-testid="goal-edit-button">
            <Pencil className="h-3 w-3" /> {data.goal ? "Edit" : "Set"}
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="font-display text-3xl sm:text-4xl tracking-tighter font-black flex items-baseline gap-2">
          <span className={profitColor}>{data.profit >= 0 ? "+" : "-"}${Math.abs(data.profit).toLocaleString()}</span>
          {data.goal != null && data.goal > 0 && (
            <span className="text-neutral-500 text-base font-bold">/ ${Number(data.goal).toLocaleString()}</span>
          )}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">{data.flips} flip{data.flips !== 1 ? "s" : ""} this month</div>
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="50"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full bg-[#0A0A0A] border border-white/15 rounded-md pl-7 pr-3 py-2 text-sm text-white outline-none focus:border-[#FF3B30]/50"
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              data-testid="goal-input"
            />
          </div>
          <button onClick={save} disabled={saving} className="h-9 w-9 rounded-md bg-[#34C759] hover:bg-[#34C759]/90 text-black grid place-items-center transition disabled:opacity-50" data-testid="goal-save"><Check className="h-4 w-4" strokeWidth={3} /></button>
          <button onClick={() => setEditing(false)} className="h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 grid place-items-center transition"><X className="h-4 w-4" /></button>
        </div>
      ) : data.goal != null && data.goal > 0 ? (
        <div className="mt-auto pt-4">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${hit ? "bg-gradient-to-r from-[#FFD60A] to-[#FF3B30]" : "bg-gradient-to-r from-[#34C759] to-[#34C759]/70"}`}
              style={{ width: `${(pct * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-widest font-bold">
            <span className={hit ? "text-[#FFD60A]" : "text-neutral-400"}>
              {hit ? "🏆 Goal hit · keep flipping" : `${Math.round(pct * 100)}% there`}
            </span>
            {!hit && <span className="text-neutral-500">${Math.max(0, Number(data.goal) - data.profit).toLocaleString()} to go</span>}
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-4 text-xs text-neutral-500 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#FFD60A]" /> Set a goal to track your monthly hustle
        </div>
      )}
    </div>
  );
}
