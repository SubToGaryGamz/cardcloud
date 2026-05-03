import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import api from "../lib/api";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { TrendingUp, Users, DollarSign, Sparkles, Layers, Trophy, Gift, ShieldCheck, ShoppingBag, Loader2 } from "lucide-react";

const Stat = ({ label, value, sub, icon: Icon, accent = "text-white" }) => (
  <div className="rounded-lg bg-[#141414] border border-white/10 p-5" data-testid={`stat-${(label || "").toLowerCase().replace(/\s+/g, "-")}`}>
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-bold text-neutral-400">
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </div>
    <div className={`mt-2 font-display text-3xl tracking-tighter font-black leading-none ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
  </div>
);

const Section = ({ title, children, right }) => (
  <section className="mt-10">
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Section</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase">{title}</h2>
      </div>
      {right}
    </div>
    {children}
  </section>
);

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtUsd = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (authLoading || !user?.is_admin) return;
    let alive = true;
    setLoading(true);
    api.get("/admin/overview")
      .then((r) => { if (alive) setData(r.data); })
      .catch((e) => { if (alive) setErr(e?.response?.data?.detail || "Failed to load"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [authLoading, user?.is_admin]);

  if (authLoading) return <div className="min-h-screen bg-[#0A0A0A] grid place-items-center text-neutral-500 font-display tracking-widest uppercase text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/dashboard" replace />;

  const u = data?.users;
  const m = data?.monetization;
  const e = data?.engagement;
  const b = data?.beta;
  const r = data?.referrals;

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 pb-24 md:pb-12 relative z-10">
        <div className="flex items-end justify-between gap-3 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FFD60A] font-bold border border-[#FFD60A]/30 bg-[#FFD60A]/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Admin · Operator view
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-3">Analytics</h1>
            <p className="text-neutral-400 text-sm mt-2">Cross-user metrics for the entire CardCloud platform.</p>
          </div>
          <Link to="/dashboard" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition" data-testid="admin-back">← My vault</Link>
        </div>

        {err ? (
          <div className="rounded-lg border border-[#FF3B30]/40 bg-[#FF3B30]/10 p-6 text-[#FF8079]" data-testid="admin-error">{err}</div>
        ) : loading || !data ? (
          <div className="h-64 grid place-items-center text-neutral-500 font-display tracking-widest uppercase text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> Crunching the numbers…
          </div>
        ) : (
          <>
            {/* GROWTH */}
            <Section title="Growth">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Stat label="Total users" value={fmt(u.total)} icon={Users} />
                <Stat label="New today" value={fmt(u.new_today)} icon={TrendingUp} accent="text-[#34C759]" />
                <Stat label="New · 7d" value={fmt(u.new_7d)} icon={TrendingUp} />
                <Stat label="New · 30d" value={fmt(u.new_30d)} icon={TrendingUp} />
              </div>
              <div className="mt-5 rounded-lg bg-[#141414] border border-white/10 p-5">
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold mb-3">Signups · last 30 days</div>
                <div className="h-56" data-testid="signup-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={u.signup_chart_30d}>
                      <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="#666" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                      <Line type="monotone" dataKey="count" stroke="#FF3B30" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>

            {/* MONETIZATION */}
            <Section title="Monetization">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Stat label="Est. MRR" value={fmtUsd(m.est_mrr)} icon={DollarSign} accent="text-[#34C759]" sub={`${m.active_monthly} mo · ${m.active_annual} yr`} />
                <Stat label="Active Pro" value={fmt(m.active_pro)} icon={Sparkles} accent="text-[#FFD60A]" sub={`${m.expired_pro} expired`} />
                <Stat label="Revenue · 30d" value={fmtUsd(m.revenue_30d)} icon={DollarSign} sub="Stripe paid txns" />
                <Stat label="Revenue · lifetime" value={fmtUsd(m.revenue_lifetime)} icon={DollarSign} />
              </div>
              <div className="mt-3 text-xs text-neutral-500">
                MRR estimate: monthly subs × $6 + annual subs × ($65 / 12). Trial periods included until expiry.
              </div>
            </Section>

            {/* ENGAGEMENT */}
            <Section title="Engagement">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Stat label="Total cards" value={fmt(e.total_cards)} icon={Layers} sub={`${fmt(e.cards_added_30d)} added · 30d`} />
                <Stat label="Cards sold" value={fmt(e.total_sold)} icon={ShoppingBag} />
                <Stat label="AI scans · total" value={fmt(e.ai_scans_total)} icon={Sparkles} sub={`${fmt(e.ai_scans_30d)} this month`} />
                <Stat label="Total profit logged" value={fmtUsd(e.total_profit_logged)} icon={TrendingUp} accent={e.total_profit_logged >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"} />
              </div>
              {e.top_sports?.length > 0 && (
                <div className="mt-5 rounded-lg bg-[#141414] border border-white/10 p-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold mb-3">Top sports</div>
                  <div className="h-56" data-testid="top-sports-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={e.top_sports}>
                        <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                        <XAxis dataKey="sport" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                        <Bar dataKey="count" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Section>

            {/* BETA + REFERRALS */}
            <Section title="Beta & Referrals">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Stat label="Beta redemptions" value={fmt(b.redeemed_total)} icon={Gift} accent="text-[#34C759]" sub={`${fmt(b.redeemed_30d)} this month`} />
                <Stat label="Referral signups" value={fmt(r.signups_via_referral)} icon={Users} />
                <Stat label="Rewards granted" value={fmt(r.rewards_granted)} icon={Trophy} accent="text-[#FFD60A]" sub="+30d each" />
                <Stat label="Top referrer" value={r.top_referrers?.[0]?.referral_rewards_given || 0} icon={Trophy} sub={r.top_referrers?.[0]?.email || "—"} />
              </div>

              {r.top_referrers?.length > 0 && (
                <div className="mt-5 rounded-lg bg-[#141414] border border-white/10 overflow-hidden" data-testid="top-referrers-list">
                  <div className="px-5 py-3 text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold border-b border-white/10">Top referrers</div>
                  <div className="divide-y divide-white/5">
                    {r.top_referrers.map((ref, i) => (
                      <div key={ref.referral_code || ref.email || i} className="flex items-center gap-4 px-5 py-3">
                        <div className="font-display text-2xl tracking-tighter font-black text-neutral-500 w-8 shrink-0">#{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-base font-bold uppercase tracking-tight truncate">{ref.name || "—"}</div>
                          <div className="text-xs text-neutral-500 truncate">{ref.email}</div>
                        </div>
                        <div className="font-mono text-xs text-neutral-400 shrink-0">{ref.referral_code || "—"}</div>
                        <div className="font-display text-lg font-black tracking-tighter text-[#FFD60A] shrink-0 w-16 text-right">+{ref.referral_rewards_given}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
              <span>Generated {new Date(data.generated_at).toLocaleString()}</span>
              <button onClick={() => window.location.reload()} className="hover:text-white transition" data-testid="admin-refresh">Refresh</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
