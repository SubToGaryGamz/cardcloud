import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts";
import api from "../lib/api";

const tickStyle = { fill: "#737373", fontSize: 11 };
const tooltipStyle = {
  contentStyle: { background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff" },
  labelStyle: { color: "#A3A3A3", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" },
  itemStyle: { color: "#fff" },
};

function monthLabel(m) {
  // "2026-03" -> "Mar '26"
  const [y, mo] = m.split("-");
  const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
  return `${d.toLocaleString("en", { month: "short" })} '${y.slice(2)}`;
}

export default function Charts({ refreshKey }) {
  const [data, setData] = useState({ monthly: [], by_year: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/cards/timeseries", { params: { months: 12 } })
      .then((r) => { if (active) setData(r.data); })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshKey]);

  const monthly = (data.monthly || []).map((m) => ({ ...m, label: monthLabel(m.month) }));
  const byYear = data.by_year || [];

  const hasMonthly = monthly.some((m) => m.paid > 0 || m.sales > 0 || m.profit !== 0);
  const hasYears = byYear.length > 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="lg:col-span-2 h-72 rounded-lg bg-[#141414] border border-white/10 animate-pulse" />
        <div className="h-72 rounded-lg bg-[#141414] border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (!hasMonthly && !hasYears) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10" data-testid="charts-section">
      {/* Profit over time */}
      <div className="lg:col-span-2 rounded-lg bg-[#141414] border border-white/10 p-5 fade-up" data-testid="chart-profit-over-time">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">Performance</div>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight mt-1">Profit over time</h3>
          </div>
          <div className="text-xs text-neutral-500">Last 12 months</div>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#007AFF" fill="url(#gSales)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#34C759" fill="url(#gProfit)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards by year */}
      <div className="rounded-lg bg-[#141414] border border-white/10 p-5 fade-up" data-testid="chart-cards-by-year">
        <div className="mb-4">
          <div className="text-xs tracking-[0.2em] uppercase text-neutral-500 font-semibold">Distribution</div>
          <h3 className="font-display text-xl font-bold uppercase tracking-tight mt-1">Cards by year</h3>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byYear} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={tickStyle} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${v} cards`} />
              <Bar dataKey="count" name="Cards" fill="#FF3B30" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
