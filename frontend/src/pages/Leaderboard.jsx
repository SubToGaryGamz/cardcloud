import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Cloud, Trophy, Layers, ArrowLeft, Crown, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RANK_TIERS = [
  { min: 0.85, label: "Diamond", className: "bg-gradient-to-r from-[#7DD3FC] to-[#A78BFA] text-black" },
  { min: 0.60, label: "Platinum", className: "bg-gradient-to-r from-[#C4B5FD] to-[#E0E7FF] text-black" },
  { min: 0.35, label: "Gold", className: "bg-[#FFD60A] text-black" },
  { min: 0.15, label: "Silver", className: "bg-neutral-300 text-black" },
  { min: 0.0,  label: "Bronze", className: "bg-[#B45309] text-white" },
];

const tierFor = (bar) => RANK_TIERS.find((t) => bar >= t.min) || RANK_TIERS[RANK_TIERS.length - 1];

function avatarUrl(_path) {
  // Avatars require auth (private files), so the public leaderboard uses initials only
  return null;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [metric, setMetric] = useState("profit"); // "profit" | "cards"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/leaderboard?metric=${metric}&limit=25`)
      .then((r) => { if (alive) setRows(r.data.rows || []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [metric]);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="lb-brand">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-lg tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <Link to={user ? "/dashboard" : "/"} className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition" data-testid="lb-back">
            <ArrowLeft className="h-4 w-4" /> {user ? "Vault" : "Home"}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-10 lg:py-16 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FFD60A] font-bold border border-[#FFD60A]/30 bg-[#FFD60A]/10 px-3 py-1.5 rounded-full">
          <Trophy className="h-3 w-3" /> CardCloud Leaderboard
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-4 leading-[0.95]">
          Who's flipping<br />the hardest?
        </h1>
        <p className="text-neutral-400 mt-4 max-w-2xl">
          Real flippers, ranked by total cards tracked or relative profit. Profit values are intentionally hidden — we only show your rank tier so people can compete without exposing portfolios.
        </p>

        {/* Metric switcher */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-[#141414] border border-white/10" data-testid="lb-metric-switch">
          <button
            onClick={() => setMetric("profit")}
            className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold transition flex items-center gap-1.5 ${metric === "profit" ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
            data-testid="lb-metric-profit"
          >
            <Trophy className="h-3 w-3" /> Most profit
          </button>
          <button
            onClick={() => setMetric("cards")}
            className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold transition flex items-center gap-1.5 ${metric === "cards" ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
            data-testid="lb-metric-cards"
          >
            <Layers className="h-3 w-3" /> Most cards
          </button>
        </div>

        {loading ? (
          <div className="mt-12 font-display tracking-widest uppercase text-sm text-neutral-500">Loading rankings…</div>
        ) : rows.length === 0 ? (
          <div className="mt-12 rounded-lg border border-white/10 bg-[#141414] p-10 text-center">
            <div className="font-display text-2xl uppercase tracking-tight font-bold">Be the first.</div>
            <p className="text-sm text-neutral-400 mt-2">No one has flipped enough to appear yet. Sign up, log a sale, claim #1.</p>
            <Link to="/login" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide text-sm shadow-glow-red transition" data-testid="lb-empty-cta">
              <Sparkles className="h-4 w-4" /> Get started
            </Link>
          </div>
        ) : (
          <>
            {/* Podium for top 3 */}
            <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="lb-podium">
              {podium.map((r) => {
                const tier = tierFor(r.bar);
                const podiumColor = r.rank === 1 ? "border-[#FFD60A] bg-gradient-to-b from-[#FFD60A]/10 to-transparent" :
                                     r.rank === 2 ? "border-neutral-400/50 bg-gradient-to-b from-neutral-400/10 to-transparent" :
                                                    "border-[#B45309]/50 bg-gradient-to-b from-[#B45309]/10 to-transparent";
                return (
                  <div key={r.rank} className={`relative rounded-xl border p-5 sm:p-6 ${podiumColor} ${r.rank === 1 ? "sm:order-2 sm:scale-105" : r.rank === 2 ? "sm:order-1" : "sm:order-3"}`} data-testid={`lb-podium-${r.rank}`}>
                    {r.rank === 1 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-6 text-[#FFD60A]" fill="#FFD60A" />}
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-400">Rank #{r.rank}</div>
                    <div className="mt-3 flex items-center gap-3">
                      {r.avatar_path ? (
                        <img src={avatarUrl(r.avatar_path)} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-[#1a1a1a] grid place-items-center ring-2 ring-white/10 text-base font-black text-neutral-400">{r.handle.slice(0, 1).toUpperCase()}</div>
                      )}
                      <div className="min-w-0">
                        <div className="font-display text-lg sm:text-xl font-black uppercase tracking-tight truncate">{r.handle}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.is_annual_pro && (
                            <span className="text-[9px] uppercase tracking-widest font-black bg-[#FFD60A] text-black px-1.5 py-0.5 rounded-sm">Pro Member</span>
                          )}
                          {!r.is_annual_pro && r.is_pro && (
                            <span className="text-[9px] uppercase tracking-widest font-black bg-[#FF3B30]/20 text-[#FF8079] border border-[#FF3B30]/40 px-1.5 py-0.5 rounded-sm">Pro</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {metric === "profit" ? (
                      <>
                        <div className="mt-5">
                          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#34C759] to-[#34C759]/60" style={{ width: `${(r.bar * 100).toFixed(1)}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`inline-flex text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-sm ${tier.className}`}>{tier.label}</span>
                            <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-bold">vs leader</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 font-display text-3xl tracking-tighter font-black">{r.card_count.toLocaleString()} <span className="text-neutral-500 text-base font-bold uppercase tracking-widest">cards</span></div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <section className="mt-10 rounded-lg border border-white/10 bg-[#141414] divide-y divide-white/5 overflow-hidden" data-testid="lb-list">
                {rest.map((r) => {
                  const tier = tierFor(r.bar);
                  return (
                    <div key={r.rank} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition" data-testid={`lb-row-${r.rank}`}>
                      <div className="font-display text-2xl tracking-tighter font-black text-neutral-500 w-10 shrink-0">#{r.rank}</div>
                      {r.avatar_path ? (
                        <img src={avatarUrl(r.avatar_path)} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10 shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#1a1a1a] grid place-items-center ring-1 ring-white/10 text-sm font-black text-neutral-400 shrink-0">{r.handle.slice(0, 1).toUpperCase()}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-display text-base font-bold uppercase tracking-tight truncate">{r.handle}</div>
                          {r.is_annual_pro && <span className="text-[9px] uppercase tracking-widest font-black bg-[#FFD60A] text-black px-1.5 py-0.5 rounded-sm">Pro Member</span>}
                          {!r.is_annual_pro && r.is_pro && <span className="text-[9px] uppercase tracking-widest font-black bg-[#FF3B30]/20 text-[#FF8079] border border-[#FF3B30]/40 px-1.5 py-0.5 rounded-sm">Pro</span>}
                        </div>
                      </div>
                      {metric === "profit" ? (
                        <div className="flex items-center gap-3 w-48 sm:w-72">
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#34C759] to-[#34C759]/60" style={{ width: `${(r.bar * 100).toFixed(1)}%` }} />
                          </div>
                          <span className={`text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-sm shrink-0 ${tier.className}`}>{tier.label}</span>
                        </div>
                      ) : (
                        <div className="font-display text-lg font-black tracking-tighter text-white shrink-0">{r.card_count.toLocaleString()}</div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* CTA for non-users */}
        {!user && (
          <section className="mt-12 rounded-xl border border-[#FF3B30]/30 bg-gradient-to-br from-[#FF3B30]/10 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] font-black text-[#FF8079]">Want on the board?</div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase mt-1">Track your first flip in 30 seconds.</h2>
            </div>
            <Link to="/login" className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red transition" data-testid="lb-cta-signup">
              <Sparkles className="h-4 w-4" /> Get started free
            </Link>
          </section>
        )}

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
        </div>
      </main>
    </div>
  );
}
