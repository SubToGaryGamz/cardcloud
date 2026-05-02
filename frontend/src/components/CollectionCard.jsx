import React, { useEffect, useState } from "react";
import { Pencil, Trash2, Image as ImageIcon, Zap, Tag as TagIcon, Share2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import api from "../lib/api";
import Lightbox from "./Lightbox";

export default function CollectionCard({ card, onEdit, onDelete, onQuickSell, onTagClick, onShareChanged }) {
  const [urls, setUrls] = useState([]);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const paths = (card.image_path ? [card.image_path] : []).concat(card.images || []);
    let revoked = false;
    const created = [];
    (async () => {
      const out = [];
      for (const p of paths) {
        try {
          const res = await api.get(`/files/${p}`, { responseType: "blob" });
          const u = URL.createObjectURL(res.data);
          created.push(u);
          out.push(u);
        } catch (e) { /* noop */ }
      }
      if (!revoked) setUrls(out);
    })();
    return () => { revoked = true; created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [card.image_path, (card.images || []).join("|")]);

  const sold = card.status === "sold";
  const profit = sold ? (Number(card.price_sold || 0) - Number(card.price_paid || 0) - Number(card.expenses || 0)) : null;
  const tags = card.tags || [];
  const extraCount = Math.max(0, urls.length - 1);

  const copyShareLink = async () => {
    try {
      let token = card.share_token;
      if (!token) {
        const r = await api.post(`/cards/${card.id}/share`);
        token = r.data.share_token;
        onShareChanged?.();
      }
      const link = `${window.location.origin}/s/c/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Share link copied");
    } catch (e) {
      toast.error("Could not create link");
    }
  };

  const revokeShare = async () => {
    try {
      await api.delete(`/cards/${card.id}/share`);
      toast.success("Share link revoked");
      onShareChanged?.();
    } catch (e) { toast.error("Revoke failed"); }
  };

  const openPublic = () => {
    if (!card.share_token) return;
    window.open(`/s/c/${card.share_token}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="card-tile rounded-lg bg-[#141414] border border-white/10 overflow-hidden flex flex-col" data-testid={`card-item-${card.id}`}>
      <div
        className="aspect-[3/4] relative bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] cursor-pointer"
        onClick={() => urls.length > 0 && setLightbox(true)}
        data-testid={`card-image-${card.id}`}
      >
        {urls.length > 0 ? (
          <img src={urls[0]} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
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
        {card.sport && (
          <span className="absolute top-3 right-3 text-[10px] px-2 py-1 uppercase tracking-[0.18em] font-bold rounded-sm bg-black/60 text-white border border-white/10 backdrop-blur-sm">
            {card.sport}
          </span>
        )}
        {card.share_token && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 uppercase tracking-widest font-bold rounded-sm bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30" data-testid={`card-shared-${card.id}`}>
            <Share2 className="h-2.5 w-2.5" /> Public
          </span>
        )}
        {extraCount > 0 && (
          <span className="absolute bottom-3 right-3 text-[10px] px-1.5 py-0.5 uppercase tracking-widest font-bold rounded-sm bg-black/70 text-white border border-white/10">
            +{extraCount}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{card.year}</div>
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white leading-tight mt-0.5 line-clamp-2" data-testid={`card-name-${card.id}`}>{card.name}</h3>
        {card.where_bought && <div className="text-xs text-neutral-400 mt-1 truncate">from {card.where_bought}</div>}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" data-testid={`card-tags-${card.id}`}>
            {tags.slice(0, 5).map((t) => (
              <button
                key={t}
                type="button"
                onClick={(e) => { e.stopPropagation(); onTagClick?.(t); }}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/5 hover:bg-[#FF3B30]/15 hover:text-[#FF3B30] border border-white/10 hover:border-[#FF3B30]/40 text-neutral-300 px-1.5 py-0.5 rounded-sm transition font-semibold"
                data-testid={`card-${card.id}-tag-${t}`}
              >
                <TagIcon className="h-2.5 w-2.5" /> {t}
              </button>
            ))}
            {tags.length > 5 && <span className="text-[10px] text-neutral-500 px-1">+{tags.length - 5}</span>}
          </div>
        )}

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid={`more-card-${card.id}`}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#141414] border-white/10 text-white">
              <DropdownMenuItem onClick={copyShareLink} className="cursor-pointer focus:bg-white/5" data-testid={`share-copy-${card.id}`}>
                <Copy className="h-3.5 w-3.5 mr-2" /> {card.share_token ? "Copy share link" : "Create share link"}
              </DropdownMenuItem>
              {card.share_token && (
                <DropdownMenuItem onClick={openPublic} className="cursor-pointer focus:bg-white/5" data-testid={`share-open-${card.id}`}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Open public view
                </DropdownMenuItem>
              )}
              {card.share_token && (
                <DropdownMenuItem onClick={revokeShare} className="cursor-pointer focus:bg-white/5 text-[#FF3B30]" data-testid={`share-revoke-${card.id}`}>
                  <EyeOff className="h-3.5 w-3.5 mr-2" /> Revoke link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer focus:bg-[#FF3B30]/10 text-[#FF3B30]" data-testid={`delete-card-${card.id}`}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {lightbox && (
        <Lightbox images={urls} startIndex={0} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
