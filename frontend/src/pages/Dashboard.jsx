import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Search, Download, X, TrendingUp, TrendingDown, Wallet, ShoppingBag, Receipt, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import CardFormModal from "../components/CardFormModal";
import StatCard from "../components/StatCard";
import CollectionCard from "../components/CollectionCard";
import Charts from "../components/Charts";
import QuickSellModal from "../components/QuickSellModal";
import ImportCsvButton from "../components/ImportCsvButton";
import SiteHeader from "../components/SiteHeader";
import { SPORTS } from "../lib/sports";

const EMPTY_BG = "https://images.unsplash.com/photo-1698239345711-67b1fabd645b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBjYXJkJTIwYmFzZWJhbGx8ZW58MHx8fHwxNzc3Njc4Njc3fDA&ixlib=rb-4.1.0&q=85";

export default function Dashboard() {
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
      setCards(r.data);
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
    try {
      const token = localStorage.getItem("cv_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cards/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "cards.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const profitPositive = (stats?.profit ?? 0) >= 0;
  const anyFilterActive = q || statusFilter !== "all" || yearFilter || sportFilter !== "all" || tagFilter;

  const clearFilters = () => {
    setQ(""); setStatusFilter("all"); setYearFilter(""); setSportFilter("all"); setTagFilter("");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 relative z-10">
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
            <ImportCsvButton onImported={bumpRefresh} />
            <Button variant="outline" onClick={onExport} className="bg-transparent border-white/20 text-white hover:bg-white/5" data-testid="export-csv-button">
              <Download className="h-4 w-4 mr-2" /> Export
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

        {/* Search & filters */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, sport, or tag…" className="pl-9 bg-[#141414] border-white/10" data-testid="search-cards-input" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8" data-testid="cards-grid">
            {cards.map((c) => (
              <CollectionCard
                key={c.id}
                card={c}
                onEdit={() => { setEditing(c); setModalOpen(true); }}
                onDelete={() => onDelete(c)}
                onQuickSell={() => setQuickSellCard(c)}
                onTagClick={(t) => setTagFilter(t)}
                onShareChanged={bumpRefresh}
              />
            ))}
          </div>
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
