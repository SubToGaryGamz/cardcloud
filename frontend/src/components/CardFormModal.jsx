import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Upload, Image as ImageIcon } from "lucide-react";
import TagInput from "./TagInput";
import MultiImageManager from "./MultiImageManager";
import { SPORTS } from "../lib/sports";

const empty = {
  year: new Date().getFullYear(),
  name: "",
  sport: "",
  tags: [],
  where_bought: "",
  price_paid: "",
  price_sold: "",
  expenses: "",
  status: "in_collection",
  purchased_date: "",
  sold_date: "",
};

export default function CardFormModal({ open, onClose, onSave, card, onCardMutated }) {
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (card) {
      setForm({
        year: card.year,
        name: card.name,
        sport: card.sport || "",
        tags: card.tags || [],
        where_bought: card.where_bought || "",
        price_paid: card.price_paid ?? "",
        price_sold: card.price_sold ?? "",
        expenses: card.expenses ?? "",
        status: card.status || "in_collection",
        purchased_date: card.purchased_date || "",
        sold_date: card.sold_date || "",
      });
    } else {
      setForm(empty);
    }
    setFile(null);
    setFilePreview(null);
  }, [card, open]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        year: parseInt(form.year, 10),
        name: form.name.trim(),
        sport: form.sport || null,
        tags: form.tags || [],
        where_bought: form.where_bought.trim(),
        price_paid: parseFloat(form.price_paid || 0) || 0,
        price_sold: form.price_sold === "" ? null : parseFloat(form.price_sold) || 0,
        expenses: parseFloat(form.expenses || 0) || 0,
        status: form.status,
        purchased_date: form.purchased_date || null,
        sold_date: form.sold_date || null,
      };
      await onSave(payload, file);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-xl max-h-[92vh] overflow-y-auto" data-testid="card-form-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight font-black uppercase">
            {card ? "Edit card" : "Add a card"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Year</Label>
              <Input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-year-input" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Card Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" placeholder="e.g. Mike Trout Topps Chrome RC" data-testid="form-name-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Sport</Label>
              <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-sport-select">
                  <SelectValue placeholder="Choose sport" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10 text-white max-h-64">
                  {SPORTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Where bought</Label>
              <Input value={form.where_bought} onChange={(e) => setForm({ ...form, where_bought: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" placeholder="eBay, COMC, local show…" data-testid="form-where-bought-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">Tags</Label>
            <TagInput value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="e.g. team, player, rookie, holo…" testId="form-tags-input" />
            <p className="text-[11px] text-neutral-500 mt-1.5">Press Enter or comma to add. Use team, player, set, parallel, etc.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Paid ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.price_paid} onChange={(e) => setForm({ ...form, price_paid: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-price-paid-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Sold For ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.price_sold} onChange={(e) => setForm({ ...form, price_sold: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-price-sold-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Expenses ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-expenses-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141414] border-white/10 text-white">
                <SelectItem value="in_collection">In Collection</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Purchased Date</Label>
              <Input type="date" value={form.purchased_date} onChange={(e) => setForm({ ...form, purchased_date: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-purchased-date-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Sold Date</Label>
              <Input type="date" value={form.sold_date} onChange={(e) => setForm({ ...form, sold_date: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" disabled={form.status !== "sold"} data-testid="form-sold-date-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">{card ? "Images" : "Image (optional)"}</Label>
            {card ? (
              <div className="mt-1.5">
                <MultiImageManager card={card} onChange={(updated) => onCardMutated?.(updated)} />
              </div>
            ) : (
              <label htmlFor="card-img" className="mt-1.5 cursor-pointer flex items-center gap-3 rounded-md border border-dashed border-white/15 bg-[#0A0A0A] p-3 hover:border-white/30 transition" data-testid="form-image-upload">
                {filePreview ? (
                  <img src={filePreview} alt="preview" className="h-14 w-14 object-cover rounded-md" />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-black/40 grid place-items-center text-neutral-500">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 text-sm text-neutral-400">
                  <div className="text-white font-semibold flex items-center gap-2"><Upload className="h-3.5 w-3.5" /> {file ? file.name : "Choose an image"}</div>
                  <div className="text-xs">PNG, JPG, WEBP — up to 8MB. Add more after saving.</div>
                </div>
                <input id="card-img" type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="form-cancel-button">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="form-save-button">
              {busy ? "Saving…" : (card ? "Save changes" : "Add card")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
