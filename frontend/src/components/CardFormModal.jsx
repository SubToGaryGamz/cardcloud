import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Upload, Image as ImageIcon, Sparkles, Loader2, X as XIcon } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import TagInput from "./TagInput";
import MultiImageManager from "./MultiImageManager";
import { SPORTS } from "../lib/sports";
import { CONDITIONS, CONDITION_IS_GRADED } from "../lib/conditions";
import { useBilling } from "../context/BillingContext";

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
  condition: "Raw",
  grade: "",
};

export default function CardFormModal({ open, onClose, onSave, card, onCardMutated }) {
  const { isPro, limits } = useBilling();
  const tagLimit = isPro ? null : (limits?.tags_per_card ?? 1);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanFields, setScanFields] = useState(null); // names of fields populated by scan, for badge display

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
    setScanFields(null);
  }, [card, open]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const onScan = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api.post("/cards/scan-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 45000,
      });
      const d = r.data || {};
      const populated = [];
      const next = { ...form };
      if (d.year) { next.year = d.year; populated.push("year"); }
      if (d.name) { next.name = d.name; populated.push("name"); }
      if (d.sport) { next.sport = d.sport; populated.push("sport"); }
      if (Array.isArray(d.tags) && d.tags.length) {
        next.tags = tagLimit ? d.tags.slice(0, tagLimit) : d.tags;
        populated.push("tags");
      }
      setForm(next);
      setScanFields(populated);
      const conf = Math.round((d.confidence || 0) * 100);
      if (populated.length === 0) toast.warning("Couldn't read this card — try a closer photo");
      else toast.success(`Scan complete · ${conf}% confidence · filled ${populated.length} field${populated.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Scan failed — please fill manually");
    } finally {
      setScanning(false);
    }
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
        condition: form.condition || null,
        grade: CONDITION_IS_GRADED(form.condition) && form.grade !== "" ? parseFloat(form.grade) : null,
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
          {!card && (
            <div className="rounded-lg border border-[#FFD60A]/30 bg-gradient-to-br from-[#FFD60A]/8 to-transparent p-3" data-testid="ai-scan-callout">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-[#FFD60A] grid place-items-center shrink-0">
                  {scanning ? (
                    <Loader2 className="h-4 w-4 text-black animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="h-4 w-4 text-black" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-[0.25em] font-black text-[#FFD60A]">AI scan</span>
                    <span className="text-[9px] uppercase tracking-widest font-black bg-[#007AFF]/15 text-[#4aa3ff] border border-[#007AFF]/30 px-1.5 py-0.5 rounded-sm" data-testid="ai-scan-beta-badge">Beta</span>
                    {scanFields && scanFields.length > 0 && (
                      <span className="text-[10px] uppercase tracking-widest text-[#34C759] font-bold">✓ Filled {scanFields.length} field{scanFields.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Snap or upload a card photo and we&rsquo;ll read year, name, sport, and tags for you.
                  </p>
                  <label className="mt-2 inline-flex items-center gap-1.5 cursor-pointer text-[11px] uppercase tracking-widest font-bold bg-white text-black hover:bg-neutral-200 px-3 py-1.5 rounded-sm transition" data-testid="ai-scan-button">
                    <Sparkles className="h-3 w-3" />
                    {scanning ? "Reading card…" : "Scan with AI"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="hidden"
                      onChange={onScan}
                      disabled={scanning}
                      data-testid="ai-scan-file-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

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
            <TagInput
              value={form.tags}
              onChange={(v) => setForm({ ...form, tags: v })}
              placeholder="e.g. team, player, rookie, holo…"
              testId="form-tags-input"
              maxTags={tagLimit}
              upgradeHint={tagLimit !== null ? `Free plan: ${tagLimit} tag per card · Upgrade to Pro for unlimited` : null}
            />
            <p className="text-[11px] text-neutral-500 mt-1.5">Press Enter or comma to add. Use team, player, set, parallel, etc.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v, grade: CONDITION_IS_GRADED(v) ? form.grade : "" })}>
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="form-condition-select">
                  <SelectValue placeholder="Choose condition" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10 text-white">
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={`text-xs tracking-widest uppercase ${CONDITION_IS_GRADED(form.condition) ? "text-neutral-400" : "text-neutral-600"}`}>Grade</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                disabled={!CONDITION_IS_GRADED(form.condition)}
                placeholder={CONDITION_IS_GRADED(form.condition) ? "e.g. 9.5" : "—"}
                className="bg-[#0A0A0A] border-white/10 mt-1.5 disabled:opacity-50"
                data-testid="form-grade-input"
              />
            </div>
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
