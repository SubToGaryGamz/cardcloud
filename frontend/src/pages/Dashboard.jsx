import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Search, Download, X, TrendingUp, TrendingDown, Wallet, ShoppingBag, Receipt, Tag as TagIcon, FileText, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import CardFormModal from "../components/CardFormModal";
import StatCard from "../components/StatCard";
import CollectionCard from "../components/CollectionCard";
import Charts from "../components/Charts";
import QuickSellModal from "../components/QuickSellModal";
import ImportCsvButton from "../components/ImportCsvButton";
import SiteHeader from "../components/SiteHeader";
import BestFlipCard from "../components/BestFlipCard";
import { SPORTS } from "../lib/sports";
import { useBilling } from "../context/BillingContext";
import { useNavigate } from "react-router-dom";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import { isNativePlatform } from "../lib/platform";

const EMPTY_BG = "https://images.unsplash.com/photo-1698239345711-67b1fabd645b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBjYXJkJTIwYmFzZWJhbGx8ZW58MHx8fHwxNzc3Njc4Njc3fDA&ixlib=rb-4.1.0&q=85";

export default function Dashboard() {
  const { isPro } = useBilling();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [quickSellCard, setQuickSellCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = async () => {
    try {
      const r = await api.get("/cards/stats", { params: range === "all" ? {} : { since: range } });
      setStats(r.data);
    } catch (e) { /* noop */ }
  };

  const loadTags = async () => {
    try {
      const r = await api.get("/cards/tags");
      setTopTags(r.data || []);
    } catch (e) { /* noop */ }
  };

  const loadCards = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (statusFilter !== "all") params.status = statusFilter;
      if (yearFilter) params.year = yearFilter;
      if (sportFilter !== "all") params.sport = sportFilter;
      if (tagFilter) params.tag = tagFilter;
      const r = await api.get("/cards", { params });
      // Sort: In Collection on top, Sold below — preserve created_at desc within each group
      const sorted = [...r.data].sort((a, b) => {
        const sa = a.status === "sold" ? 1 : 0;
        const sb = b.status === "sold" ? 1 : 0;
        if (sa !== sb) return sa - sb;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
      setCards(sorted);
    } catch (e) {
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); loadTags(); }, [refreshKey, range]);
  useEffect(() => {
    const t = setTimeout(loadCards, 250);
    return () => clearTimeout(t);
  }, [q, statusFilter, yearFilter, sportFilter, tagFilter, refreshKey]);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const onSave = async (form, file) => {
    try {
      let saved;
      if (editing) {
        const r = await api.put(`/cards/${editing.id}`, form);
        saved = r.data;
      } else {
        const r = await api.post("/cards", form);
        saved = r.data;
      }
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/cards/${saved.id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      toast.success(editing ? "Card updated" : "Card added");
      setModalOpen(false);
      setEditing(null);
      bumpRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    }
  };

  const onDelete = async (card) => {
    if (!window.confirm(`Delete ${card.name}?`)) return;
    try {
      await api.delete(`/cards/${card.id}`);
      toast.success("Card deleted");
      bumpRefresh();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const onExport = async () => {
    if (!isPro) {
      toast.error("CSV export is a Pro feature. Upgrade in Profile.");
      navigate("/profile");
      return;
    }
    try {
      const token = localStorage.getItem("cv_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cards/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 402) { toast.error("Pro required"); navigate("/profile"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "cards.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const onTaxExport = async () => {
    if (!isPro) {
      toast.error("Tax Export is a Pro feature. Upgrade in Profile.");
      navigate("/profile");
      return;
    }
    try {
      const yearStr = window.prompt("Tax year? (leave blank for all)", String(new Date().getFullYear()));
      if (yearStr === null) return;
      const year = yearStr.trim();
      const token = localStorage.getItem("cv_token");
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/cards/tax/export.csv${year ? `?year=${encodeURIComponent(year)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 402) { toast.error("Pro required"); navigate("/profile"); return; }
      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl; a.download = `cardcloud_tax_8949_${year || "all"}.csv`; a.click();
      URL.revokeObjectURL(dl);
      toast.success("Tax export ready");
    } catch (e) {
      toast.error("Tax export failed");
    }
  };

  // Keyboard shortcuts: n=new, /=focus search, 1=in collection, 2=sold
  const shortcutMap = useMemo(() => ({
    n: () => { setEditing(null); setModalOpen(true); },
    "/": () => searchRef.current?.focus(),
    "1": () => document.querySelector('[data-testid="section-in-collection"]')?.scrollIntoView({ behavior: "smooth", block: "start" }),
    "2": () => document.querySelector('[data-testid="section-sold"]')?.scrollIntoView({ behavior: "smooth", block: "start" }),
  }), []);
  useKeyboardShortcuts(shortcutMap);

  const profitPositive = (stats?.profit ?? 0) >= 0;
  const anyFilterActive = q || statusFilter !== "all" || yearFilter || sportFilter !== "all" || tagFilter;

  const clearFilters = () => {
    setQ(""); setStatusFilter("all"); setYearFilter(""); setSportFilter("all"); setTagFilter("");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 relative z-10">
        {/* Pro upsell banner (free users only — hidden in native to comply with App Store IAP rules) */}
        {!isPro && !isNativePlatform() && (
          <div className="relative mb-6 rounded-xl bg-gradient-to-br from-[#FFD60A]/15 via-[#141414] to-[#141414] border border-[#FFD60A]/40 p-5 sm:p-6 overflow-hidden shadow-glow-red fade-up" data-testid="pro-upsell-banner">
            <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 h-44 w-44 rounded-full bg-[#FFD60A]/20 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-11 w-11 shrink-0 rounded-md bg-[#FFD60A] grid place-items-center">
                  <Sparkles className="h-5 w-5 text-black" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black bg-[#FFD60A] text-black px-2 py-0.5 rounded-sm">Pro</span>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">$6/month · cancel anytime</span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight mt-1 leading-tight">
                    Unlock CSV imports, exports & IRS Form 8949
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-300">
                    <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#34C759]" /> Bulk CSV import</li>
                    <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#34C759]" /> Full CSV export</li>
                    <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#34C759]" /> Tax-ready 8949 (short/long term)</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={() => navigate("/profile")}
                className="shrink-0 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red"
                data-testid="pro-upsell-upgrade-button"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Pro
              </Button>
            </div>
          </div>
        )}

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">Your collection</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-1">
              The Cloud
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px] bg-[#141414] border-white/10" data-testid="time-range-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141414] border-white/10 text-white">
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <ImportCsvButton onImported={bumpRefresh} isPro={isPro} onLockedClick={() => navigate("/profile")} />
            <Button variant="outline" onClick={onExport} className="bg-transparent border-white/20 text-white hover:bg-white/5" data-testid="export-csv-button">
              {isPro ? <Download className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />} Export
            </Button>
            <Button variant="outline" onClick={onTaxExport} className="bg-transparent border-white/20 text-white hover:bg-white/5" data-testid="tax-export-button">
              {isPro ? <FileText className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />} Tax 8949
            </Button>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="add-card-button">
              <Plus className="h-4 w-4 mr-2" /> Add Card
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 lg:mb-10">
          <StatCard
            label="Total Paid"
            value={`$${(stats?.total_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<Wallet className="h-4 w-4" />}
            sub={`${stats?.total_cards ?? 0} cards`}
            testId="total-paid-metric"
          />
          <StatCard
            label="Total Sales"
            value={`$${(stats?.total_sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<ShoppingBag className="h-4 w-4" />}
            sub={`${stats?.sold_count ?? 0} sold`}
            testId="total-sales-metric"
          />
          <StatCard
            label="Expenses"
            value={`$${(stats?.total_expenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<Receipt className="h-4 w-4" />}
            sub="Shipping, fees…"
            testId="total-expenses-metric"
          />
          <StatCard
            label="Net Profit"
            value={`${profitPositive ? "+" : "−"}$${Math.abs(stats?.profit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={profitPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            sub="On sold cards"
            highlight={profitPositive ? "green" : "red"}
            testId="total-profit-metric"
          />
        </div>

        <Charts refreshKey={refreshKey} />

        {/* Best Flip */}
        <div className="mb-8">
          <BestFlipCard since={range} refreshKey={refreshKey} />
        </div>

        {/* Search & filters */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, sport, or tag…  (press / to focus)" className="pl-9 bg-[#141414] border-white/10" data-testid="search-cards-input" />
          </div>
          <Input
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Year"
            className="w-full md:w-28 bg-[#141414] border-white/10"
            data-testid="filter-year-input"
          />
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-full md:w-40 bg-[#141414] border-white/10" data-testid="filter-sport-select">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10 text-white max-h-64">
              <SelectItem value="all">All sports</SelectItem>
              {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-[#141414] border-white/10" data-testid="filter-status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-white/10 text-white">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_collection">In Collection</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tag chip row */}
        {(topTags.length > 0 || tagFilter) && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5" data-testid="tag-chip-row">
            <span className="text-[10px] tracking-widest uppercase text-neutral-500 font-semibold mr-1">Tags</span>
            {tagFilter && (
              <button onClick={() => setTagFilter("")} className="inline-flex items-center gap-1 text-xs bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 px-2 py-1 rounded-sm uppercase tracking-wider font-semibold" data-testid="active-tag-filter">
                <TagIcon className="h-3 w-3" /> {tagFilter} <X className="h-3 w-3" />
              </button>
            )}
            {topTags.slice(0, 14).filter((t) => t.tag !== tagFilter).map((t) => (
              <button
                key={t.tag}
                onClick={() => setTagFilter(t.tag)}
                className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 px-2 py-1 rounded-sm uppercase tracking-wider font-semibold transition"
                data-testid={`tag-chip-${t.tag}`}
              >
                {t.tag}
                <span className="text-neutral-500 normal-case tracking-normal">{t.count}</span>
              </button>
            ))}
            {anyFilterActive && (
              <button onClick={clearFilters} className="ml-auto text-xs text-neutral-400 hover:text-white underline underline-offset-2" data-testid="clear-filters">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-lg bg-[#141414] border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#141414] p-10 text-center" data-testid="empty-state">
            <div className="mx-auto w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden mb-6 ring-1 ring-white/10">
              <img src={EMPTY_BG} alt="" className="w-full h-full object-cover opacity-70" />
            </div>
            <h3 className="font-display text-2xl tracking-tight font-bold uppercase">Nothing here yet</h3>
            <p className="text-neutral-400 text-sm mt-2 max-w-md mx-auto">
              {anyFilterActive ? "No cards match these filters." : "Add your first card to start tracking purchases, sales, and profits."}
            </p>
            <Button onClick={() => { anyFilterActive ? clearFilters() : (setEditing(null), setModalOpen(true)); }} className="mt-5 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="empty-add-card-button">
              {anyFilterActive ? "Clear filters" : (<><Plus className="h-4 w-4 mr-2" /> Add your first card</>)}
            </Button>
          </div>
        ) : (
          (() => {
            const inCol = cards.filter((c) => c.status !== "sold");
            const sold = cards.filter((c) => c.status === "sold");
            const renderCard = (c) => (
              <CollectionCard
                key={c.id}
                card={c}
                onEdit={() => { setEditing(c); setModalOpen(true); }}
                onDelete={() => onDelete(c)}
                onQuickSell={() => setQuickSellCard(c)}
                onTagClick={(t) => setTagFilter(t)}
                onShareChanged={bumpRefresh}
              />
            );
            const soldProfit = sold.reduce((acc, c) => acc + (Number(c.price_sold || 0) - Number(c.price_paid || 0) - Number(c.expenses || 0)), 0);
            const SectionHeader = ({ accent, label, count, right }) => (
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`h-7 w-1.5 rounded-sm ${accent}`} />
                  <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-bold">{label}</div>
                    <div className="font-display text-2xl sm:text-3xl tracking-tight font-black uppercase mt-0.5">
                      {count} <span className="text-neutral-500 font-normal text-base">card{count === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </div>
                {right}
              </div>
            );
            return (
              <div className="space-y-12" data-testid="cards-grid">
                {inCol.length > 0 && (
                  <section data-testid="section-in-collection">
                    <SectionHeader accent="bg-[#007AFF]" label="In Collection" count={inCol.length} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                      {inCol.map(renderCard)}
                    </div>
                  </section>
                )}
                {sold.length > 0 && (
                  <section data-testid="section-sold">
                    <SectionHeader
                      accent={soldProfit >= 0 ? "bg-[#34C759]" : "bg-[#FF3B30]"}
                      label="Sold"
                      count={sold.length}
                      right={
                        <div className="text-right">
                          <div className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-bold">Total Profit</div>
                          <div className={`font-display text-2xl sm:text-3xl tracking-tight font-black ${soldProfit >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`} data-testid="sold-section-profit">
                            {soldProfit >= 0 ? "+" : "−"}${Math.abs(soldProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                      {sold.map(renderCard)}
                    </div>
                  </section>
                )}
              </div>
            );
          })()
        )}
      </main>

      <CardFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={onSave}
        card={editing}
        onCardMutated={(updated) => { setEditing(updated); bumpRefresh(); }}
      />

      <QuickSellModal
        open={!!quickSellCard}
        card={quickSellCard}
        onClose={() => setQuickSellCard(null)}
        onDone={bumpRefresh}
      />
    </div>
  );
}
