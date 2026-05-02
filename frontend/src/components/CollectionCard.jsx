import React, { useEffect, useState } from "react";
import { Pencil, Trash2, Image as ImageIcon, Zap } from "lucide-react";
import { Button } from "./ui/button";
import api from "../lib/api";

export default function CollectionCard({ card, onEdit, onDelete, onQuickSell }) {
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    let revoked = false;
    let url = null;
    const load = async () => {
      if (!card.image_path) return;
      try {
        const res = await api.get(`/files/${card.image_path}`, { responseType: "blob" });
        url = URL.createObjectURL(res.data);
        if (!revoked) setImgUrl(url);
      } catch (e) { /* noop */ }
    };
    load();
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
  }, [card.image_path]);

  const sold = card.status === "sold";
  const profit = sold ? (Number(card.price_sold || 0) - Number(card.price_paid || 0) - Number(card.expenses || 0)) : null;

  return (
    <div className="card-tile rounded-lg bg-[#141414] border border-white/10 overflow-hidden flex flex-col" data-testid={`card-item-${card.id}`}>
      <div className="aspect-[3/4] relative bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c]">
        {imgUrl ? (
          <img src={imgUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-neutral-700">
            <ImageIcon className="h-14 w-14" strokeWidth={1.5} />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] px-2 py-1 uppercase tracking-[0.18em] font-bold rounded-sm border ${
          sold
            ? "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30"
            : "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30"
        }`}>
          {sold ? "Sold" : "In Collection"}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{card.year}</div>
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white leading-tight mt-0.5 line-clamp-2" data-testid={`card-name-${card.id}`}>{card.name}</h3>
        {card.where_bought && <div className="text-xs text-neutral-400 mt-1 truncate">from {card.where_bought}</div>}

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-black/40 border border-white/5 p-2">
            <div className="text-neutral-500 uppercase tracking-wider text-[10px]">Paid</div>
            <div className="text-white font-semibold mt-0.5">${Number(card.price_paid || 0).toFixed(2)}</div>
          </div>
          <div className="rounded-md bg-black/40 border border-white/5 p-2">
            <div className="text-neutral-500 uppercase tracking-wider text-[10px]">{sold ? "Sold for" : "Expenses"}</div>
            <div className="text-white font-semibold mt-0.5">
              ${sold ? Number(card.price_sold || 0).toFixed(2) : Number(card.expenses || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {sold && (
          <div className={`mt-2 text-xs font-bold uppercase tracking-wider ${profit >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`} data-testid={`card-profit-${card.id}`}>
            {profit >= 0 ? "+" : "−"}${Math.abs(profit).toFixed(2)} profit
          </div>
        )}

        <div className="mt-auto pt-4 flex gap-2">
          {!sold && (
            <Button size="sm" onClick={onQuickSell} className="flex-1 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid={`quick-sell-${card.id}`}>
              <Zap className="h-3.5 w-3.5 mr-1.5" /> Quick Sell
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit} className={`${sold ? "flex-1" : ""} bg-transparent border-white/15 text-white hover:bg-white/5`} data-testid={`edit-card-${card.id}`}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="bg-transparent border-white/15 text-neutral-300 hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] hover:border-[#FF3B30]/40" data-testid={`delete-card-${card.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
