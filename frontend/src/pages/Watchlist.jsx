import React, { useEffect, useState } from "react";
import api from "../lib/api";
import SiteHeader from "../components/SiteHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Eye, Plus, Target, Trash2, Pencil, ShoppingBag, Tag as TagIcon, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import TagInput from "../components/TagInput";
import { SPORTS } from "../lib/sports";

function WatchForm({ open, onClose, onSave, item }) {
  const [form, setForm] = useState({ year: new Date().getFullYear(), name: "", sport: "", tags: [], target_price: "", notes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (item) setForm({
      year: item.year, name: item.name, sport: item.sport || "", tags: item.tags || [],
      target_price: item.target_price ?? "", notes: item.notes || ""
    });
    else setForm({ year: new Date().getFullYear(), name: "", sport: "", tags: [], target_price: "", notes: "" });
  }, [item, open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        year: parseInt(form.year, 10),
        name: form.name.trim(),
        sport: form.sport || null,
        tags: form.tags || [],
        target_price: form.target_price === "" ? null : parseFloat(form.target_price) || 0,
        notes: form.notes,
      });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-lg" data-testid="watch-form-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight font-black uppercase">
            {item ? "Edit target" : "Add to watchlist"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Year</Label>
              <Input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="watch-year-input" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Card Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="watch-name-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Sport</Label>
              <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="watch-sport-select"><SelectValue placeholder="Choose sport" /></SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10 text-white max-h-64">
                  {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Target Price ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="watch-target-input" />
            </div>
          </div>
          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">Tags</Label>
            <TagInput value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} testId="watch-tags-input" />
          </div>
          <div>
            <Label className="text-xs tracking-widest uppercase text-neutral-400">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5 min-h-[80px]" data-testid="watch-notes-input" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="watch-cancel">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="watch-save">
              {busy ? "Saving…" : (item ? "Save" : "Add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AcquireModal({ open, onClose, item, onDone }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ price_paid: "", where_bought: "", expenses: "", purchased_date: today });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && item) setForm({ price_paid: item.target_price ?? "", where_bought: "", expenses: "", purchased_date: today });
  }, [item, open]);

  if (!item) return null;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/watchlist/${item.id}/acquire`, {
        price_paid: parseFloat(form.price_paid || 0) || 0,
        where_bought: form.where_bought.trim(),
        expenses: parseFloat(form.expenses || 0) || 0,
        purchased_date: form.purchased_date || null,
      });
      toast.success(`Acquired: ${item.name}`);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to acquire");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-md" data-testid="acquire-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight font-black uppercase">Acquire card</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-white/10 bg-black/40 p-3 mb-2">
          <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{item.year}{item.sport ? ` · ${item.sport}` : ""}</div>
          <div className="font-display text-lg font-bold uppercase tracking-tight">{item.name}</div>
          {item.target_price ? <div className="text-xs text-neutral-400 mt-1">Target was <span className="text-white font-semibold">${Number(item.target_price).toFixed(2)}</span></div> : null}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Price Paid ($)</Label>
              <Input autoFocus type="number" step="0.01" min="0" required value={form.price_paid} onChange={(e) => setForm({ ...form, price_paid: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="acquire-price-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Expenses ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="acquire-expenses-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Where bought</Label>
              <Input value={form.where_bought} onChange={(e) => setForm({ ...form, where_bought: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" placeholder="eBay…" data-testid="acquire-where-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Purchased Date</Label>
              <Input type="date" value={form.purchased_date} onChange={(e) => setForm({ ...form, purchased_date: e.target.value })} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="acquire-date-input" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="acquire-cancel">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="acquire-submit">
              {busy ? "Acquiring…" : "Move to collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [acquiring, setAcquiring] = useState(null);
  const [estimating, setEstimating] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/watchlist");
      setItems(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSave = async (payload) => {
    try {
      if (editing) await api.put(`/watchlist/${editing.id}`, payload);
      else await api.post("/watchlist", payload);
      toast.success(editing ? "Updated" : "Added to watchlist");
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    }
  };

  const onDelete = async (item) => {
    if (!window.confirm(`Remove ${item.name} from watchlist?`)) return;
    try {
      await api.delete(`/watchlist/${item.id}`);
      toast.success("Removed");
      load();
    } catch (e) { toast.error("Delete failed"); }
  };

  const ebayCompsUrl = (item) => {
    const q = encodeURIComponent(`${item.year || ""} ${item.name || ""} ${(item.tags || []).join(" ")}`.trim());
    // LH_Sold=1 & LH_Complete=1 → sold listings only
    return `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
  };

  const onEstimate = async (item) => {
    setEstimating(item.id);
    try {
      const r = await api.post(`/watchlist/${item.id}/estimate`);
      toast.success(`AI estimate: $${r.data.low.toFixed(0)}–$${r.data.high.toFixed(0)} (typical $${r.data.typical.toFixed(0)})`);
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, ai_estimate: r.data } : it));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Estimate failed");
    } finally {
      setEstimating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Watchlist</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-1">Targets</h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-md">Cards you're hunting. Acquire turns a target into a real collection card with one tap.</p>
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="add-watch-button">
            <Plus className="h-4 w-4 mr-2" /> Add target
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-[#141414] border border-white/10 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#141414] p-10 text-center" data-testid="watchlist-empty">
            <Target className="h-12 w-12 text-neutral-700 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-display text-2xl tracking-tight font-bold uppercase">No targets yet</h3>
            <p className="text-neutral-400 text-sm mt-2 max-w-md mx-auto">Add cards you're watching before pulling the trigger.</p>
            <Button onClick={() => setModalOpen(true)} className="mt-5 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide"><Plus className="h-4 w-4 mr-2" /> Add your first target</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="watchlist-grid">
            {items.map((item) => (
              <div key={item.id} className="card-tile rounded-lg bg-[#141414] border border-white/10 p-5 flex flex-col" data-testid={`watch-item-${item.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">{item.year}{item.sport ? ` · ${item.sport}` : ""}</div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-tight mt-0.5 line-clamp-2">{item.name}</h3>
                  </div>
                  {item.target_price != null && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500">Target</div>
                      <div className="font-display text-xl font-black text-[#FF3B30]">${Number(item.target_price).toFixed(2)}</div>
                    </div>
                  )}
                </div>
                {(item.tags || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(item.tags || []).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 text-neutral-300 px-1.5 py-0.5 rounded-sm font-semibold">
                        <TagIcon className="h-2.5 w-2.5" /> {t}
                      </span>
                    ))}
                  </div>
                )}
                {item.notes && <p className="text-xs text-neutral-400 mt-3 line-clamp-3 italic">“{item.notes}”</p>}

                {item.ai_estimate && (
                  <div className="mt-3 rounded-md border border-[#007AFF]/30 bg-[#007AFF]/5 p-2.5" data-testid={`ai-estimate-${item.id}`}>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#4aa3ff] font-bold">
                      <Sparkles className="h-3 w-3" /> AI estimate
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      ${Number(item.ai_estimate.low).toFixed(0)}–${Number(item.ai_estimate.high).toFixed(0)}
                      <span className="text-neutral-400 font-normal"> · typical <span className="text-white">${Number(item.ai_estimate.typical).toFixed(0)}</span></span>
                    </div>
                    {item.ai_estimate.note && <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{item.ai_estimate.note}</div>}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={ebayCompsUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 px-2 py-1 rounded-sm font-semibold transition"
                    data-testid={`comps-link-${item.id}`}
                  >
                    <ExternalLink className="h-2.5 w-2.5" /> View sold comps
                  </a>
                  <button
                    onClick={() => onEstimate(item)}
                    disabled={estimating === item.id}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#4aa3ff] border border-[#007AFF]/30 px-2 py-1 rounded-sm font-semibold transition disabled:opacity-50"
                    data-testid={`estimate-button-${item.id}`}
                  >
                    <Sparkles className="h-2.5 w-2.5" /> {estimating === item.id ? "Estimating…" : "AI estimate"}
                  </button>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                  <Button size="sm" onClick={() => setAcquiring(item)} className="flex-1 bg-[#34C759] hover:bg-[#34C759]/90 text-black font-bold uppercase tracking-wide" data-testid={`acquire-button-${item.id}`}>
                    <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Acquired
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(item); setModalOpen(true); }} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid={`edit-watch-${item.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(item)} className="bg-transparent border-white/15 text-neutral-300 hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] hover:border-[#FF3B30]/40" data-testid={`delete-watch-${item.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <WatchForm open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={onSave} item={editing} />
      <AcquireModal open={!!acquiring} item={acquiring} onClose={() => setAcquiring(null)} onDone={load} />
    </div>
  );
}
