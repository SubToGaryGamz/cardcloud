import React from "react";
import { Link } from "react-router-dom";
import {
  Cloud, Trophy, Tag as TagIcon, Eye, Share2, Sparkles,
  TrendingUp, Image as ImageIcon, ArrowRight, CheckCircle2,
  Wallet, ShoppingBag, Zap, BarChart3, FileText, Download, Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const HERO_BG = "https://images.unsplash.com/photo-1642692704112-80f6ba7f6aa3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwyfHxiYXNrZXRiYWxsJTIwY2FyZHxlbnwwfHx8fDE3Nzc2Nzg2Nzd8MA&ixlib=rb-4.1.0&q=85";

const FEATURES = [
  { icon: Wallet, title: "Real profit, not vibes", body: "Log paid, sold, and every fee. Your dashboard does the math — by card, month, and lifetime." },
  { icon: TagIcon, title: "Tag everything", body: "Player, team, set, parallel, rookie. Click any tag to instantly pull every matching card." },
  { icon: Trophy, title: "Best Flip tile", body: "The dashboard auto-surfaces your top-profit sale of the week, month, or all time." },
  { icon: BarChart3, title: "Charts that earn", body: "Profit over time, cards by year, sales pace. Spot what's moving and what's stuck." },
  { icon: Eye, title: "Watchlist + AI estimates", body: "Track targets, view real eBay sold comps, and get a Claude-powered price range in one click." },
  { icon: Share2, title: "Public showcase", body: "Share a single card or your whole vault with a link. Cost basis stays private." },
];

const STEPS = [
  { n: "01", title: "Add a card", body: "Year, name, sport, tags, condition + grade, paid, fees. Add a photo (or six)." },
  { n: "02", title: "Track every flip", body: "Quick-Sell flips a card to Sold in one tap. Profit recalculates instantly." },
  { n: "03", title: "Show off", body: "Generate a public link for your hits, or flip a switch to share the whole vault." },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-brand">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-xl tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            <a href="#features" className="hover:text-white transition" data-testid="nav-features">Features</a>
            <a href="#how" className="hover:text-white transition" data-testid="nav-how">How it works</a>
            <a href="#pricing" className="hover:text-white transition" data-testid="nav-pricing">Pricing</a>
            <a href="#showcase" className="hover:text-white transition" data-testid="nav-showcase">Showcase</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide text-sm transition" data-testid="cta-go-to-vault">
                Go to vault <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition" data-testid="cta-sign-in">
                  Sign in
                </Link>
                <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide text-sm transition" data-testid="cta-get-started">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FF8079] font-bold border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1.5 rounded-full" data-testid="hero-eyebrow">
              <Sparkles className="h-3 w-3" /> Built for sports card flippers
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tighter font-black uppercase leading-[0.92] mt-5">
              Your collection,<br />
              <span className="text-[#FF3B30]">in the cloud.</span><br />
              Profits, clear as day.
            </h1>
            <p className="mt-6 text-neutral-300 text-base sm:text-lg max-w-2xl">
              CardCloud is the no-nonsense tracker for sports trading cards. Log every buy, sell, and shipping fee. Watch profit add up — by card, by month, by player. No spreadsheets. No guesswork.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition shadow-glow-red" data-testid="hero-cta-primary">
                  Open my vault <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition shadow-glow-red" data-testid="hero-cta-primary">
                    Start tracking — free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/15 hover:bg-white/5 text-white font-semibold uppercase tracking-wide transition" data-testid="hero-cta-secondary">
                    See features
                  </a>
                </>
              )}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400">
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Free to start</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Google or email login</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> CSV import & export</li>
            </ul>
          </div>

          {/* Floating stat badges */}
          <div className="hidden lg:block absolute right-12 top-32 w-72 fade-up">
            <div className="rounded-lg bg-[#141414]/90 backdrop-blur border border-white/10 p-5 shadow-glow-red">
              <div className="flex items-center justify-between text-neutral-500 text-xs uppercase tracking-widest font-semibold">
                <span>Net Profit</span><TrendingUp className="h-4 w-4 text-[#34C759]" />
              </div>
              <div className="mt-2 font-display text-4xl font-black text-[#34C759]">+$2,415</div>
              <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Last 90 days</div>
            </div>
            <div className="mt-4 rounded-lg bg-[#141414]/90 backdrop-blur border border-[#FF3B30]/30 p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#FF8079] font-bold">
                <Trophy className="h-3.5 w-3.5" /> Best Flip
              </div>
              <div className="mt-2 font-display text-2xl font-black uppercase tracking-tight">2018 Luka Prizm</div>
              <div className="text-sm text-neutral-400 mt-1">$80 → $312 · <span className="text-[#34C759] font-bold">+$232</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-y border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { k: "Cards tracked", v: "Every. Single. One." },
            { k: "Per-card profit", v: "Auto-calculated" },
            { k: "Data import", v: "CSV in seconds" },
            { k: "Public showcase", v: "Share without leaking cost" },
          ].map((s) => (
            <div key={s.k}>
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">{s.k}</div>
              <div className="mt-1 font-display text-lg sm:text-xl font-black uppercase tracking-tight text-white">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-28">
        <div className="max-w-2xl">
          <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-bold">What you get</div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase leading-[0.95] mt-2">
            Built for the<br />grind.
          </h2>
          <p className="text-neutral-400 mt-4 text-base">
            Every feature exists because flipping cards is messy and spreadsheets lie.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" data-testid="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-tile rounded-lg bg-[#141414] border border-white/10 p-6">
              <div className="h-10 w-10 rounded-md bg-[#FF3B30]/15 border border-[#FF3B30]/30 grid place-items-center text-[#FF3B30]">
                <f.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-xl font-black uppercase tracking-tight mt-4">{f.title}</h3>
              <p className="text-neutral-400 text-sm mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-bold">How it works</div>
              <h2 className="font-display text-4xl sm:text-5xl tracking-tighter font-black uppercase leading-[0.95] mt-2">
                Three steps.<br />Then you're flipping.
              </h2>
              <p className="text-neutral-400 mt-4 text-base">No setup wizard. No subscription paywall to start. Add your first card in under a minute.</p>
            </div>
            <div className="lg:col-span-2 space-y-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card-tile rounded-lg bg-[#141414] border border-white/10 p-6 flex gap-5 items-start">
                  <div className="font-display text-3xl font-black text-[#FF3B30] tracking-tighter shrink-0 w-12">{s.n}</div>
                  <div>
                    <h3 className="font-display text-xl font-black uppercase tracking-tight">{s.title}</h3>
                    <p className="text-neutral-400 text-sm mt-1.5 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Pro */}
      <section id="pricing" className="border-t border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FFD60A] font-bold border border-[#FFD60A]/30 bg-[#FFD60A]/10 px-3 py-1.5 rounded-full">
              <Sparkles className="h-3 w-3" /> Pricing
            </div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase leading-[0.95] mt-3">
              Start free.<br />Flip like a <span className="text-[#FFD60A]">Pro.</span>
            </h2>
            <p className="text-neutral-400 mt-4 text-base">
              Track unlimited cards free, forever. Upgrade when you want power features like tax exports and CSV backups.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 max-w-4xl">
            {/* FREE */}
            <div className="rounded-xl bg-[#141414] border border-white/10 p-7 sm:p-8 flex flex-col" data-testid="pricing-free">
              <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-bold">Starter</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-5xl sm:text-6xl font-black tracking-tighter">$0</span>
                <span className="text-neutral-500 text-sm uppercase tracking-widest font-bold">/forever</span>
              </div>
              <p className="text-neutral-400 text-sm mt-3">Everything you need to track every flip.</p>
              <ul className="mt-6 space-y-2.5 text-sm text-neutral-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> Unlimited cards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> Multi-image per card</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> 1 tag per card</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> Charts, Best Flip, profit tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> Public showcase links</li>
              </ul>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:bg-white/5 text-white font-semibold uppercase tracking-wide transition"
                data-testid="pricing-free-cta"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* PRO */}
            <div className="relative rounded-xl bg-gradient-to-br from-[#FFD60A]/15 via-[#141414] to-[#141414] border border-[#FFD60A]/40 p-7 sm:p-8 flex flex-col shadow-glow-red overflow-hidden" data-testid="pricing-pro">
              <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 h-44 w-44 rounded-full bg-[#FFD60A]/20 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs tracking-[0.3em] uppercase text-[#FFD60A] font-bold">Pro</div>
                  <span className="text-[10px] uppercase tracking-widest font-black bg-[#FFD60A] text-black px-2 py-0.5 rounded-sm">Best value</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl sm:text-6xl font-black tracking-tighter">$6</span>
                  <span className="text-neutral-500 text-sm uppercase tracking-widest font-bold">/month</span>
                </div>
                <p className="text-neutral-300 text-sm mt-3">Everything in Starter, plus power tools built for serious flippers.</p>
                <ul className="mt-6 space-y-2.5 text-sm text-neutral-200">
                  <li className="flex items-center gap-2"><Eye className="h-4 w-4 text-[#FFD60A] shrink-0" /> Watchlist + AI price estimates (Claude)</li>
                  <li className="flex items-center gap-2"><TagIcon className="h-4 w-4 text-[#FFD60A] shrink-0" /> Unlimited tags per card</li>
                  <li className="flex items-center gap-2"><Upload className="h-4 w-4 text-[#FFD60A] shrink-0" /> CSV import — bulk-add hundreds of cards</li>
                  <li className="flex items-center gap-2"><Download className="h-4 w-4 text-[#FFD60A] shrink-0" /> CSV export — full backup, anytime</li>
                  <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#FFD60A] shrink-0" /> IRS Form 8949 tax export (short/long term)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" /> Cancel anytime · no lock-in</li>
                </ul>
                <Link
                  to={user ? "/profile" : "/login"}
                  className="mt-8 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition shadow-glow-red"
                  data-testid="pricing-pro-cta"
                >
                  <Sparkles className="h-4 w-4" /> {user ? "Upgrade to Pro" : "Get Pro — $6/mo"}
                </Link>
                <div className="text-[11px] text-neutral-500 mt-3 uppercase tracking-widest">
                  Secure checkout via Stripe · No card needed to start free
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase callout */}
      <section id="showcase" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-28">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#FF3B30]/10 via-[#141414] to-[#141414] p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 h-64 w-64 rounded-full bg-[#FF3B30]/20 blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FF8079] font-bold">
                <Share2 className="h-3 w-3" /> Public Showcase
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tighter font-black uppercase leading-[0.95] mt-3">
                Flex the hit.<br />Hide the cost.
              </h2>
              <p className="text-neutral-300 mt-4">
                Generate a clean read-only link for any single card or your entire vault. Costs, sale prices, and fees stay private — images, sport, and tags don't.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-neutral-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Per-card share token</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Public vault toggle</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Revoke any link, any time</li>
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-lg bg-[#0A0A0A] border border-white/10 p-5 shadow-2xl">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF3B30]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFCC00]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34C759]/80" />
                  <span className="ml-3 text-[10px] uppercase tracking-widest text-neutral-500 font-mono">cardcloud.app/showcase/lebron-rookie</span>
                </div>
                <div className="rounded-md aspect-[4/3] bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] border border-white/10 grid place-items-center text-neutral-700">
                  <ImageIcon className="h-12 w-12" strokeWidth={1.5} />
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">2003 · Basketball</div>
                  <div className="font-display text-lg font-black uppercase tracking-tight">LeBron James Topps RC</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["lakers", "lebron james", "rookie"].map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 text-neutral-300 px-1.5 py-0.5 rounded-sm font-semibold">
                        <TagIcon className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-20 lg:py-28 text-center">
          <div className="inline-flex h-12 w-12 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red mb-6">
            <Cloud className="h-6 w-6 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase leading-[0.95]">
            Stop guessing.<br />Start tracking.
          </h2>
          <p className="text-neutral-400 mt-5 text-base sm:text-lg max-w-xl mx-auto">
            Two minutes to your first card. Free forever to start. Your collection deserves more than a notes app.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition shadow-glow-red" data-testid="bottom-cta-primary">
                Open my vault <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition shadow-glow-red" data-testid="bottom-cta-primary">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/15 hover:bg-white/5 text-white font-semibold uppercase tracking-wide transition" data-testid="bottom-cta-secondary">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center">
              <Cloud className="h-3.5 w-3.5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-base tracking-tight font-black uppercase text-white">CardCloud</span>
          </div>
          <div className="flex items-center gap-5 text-xs uppercase tracking-widest">
            <Link to="/privacy" className="hover:text-white transition" data-testid="footer-privacy-link">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition" data-testid="footer-terms-link">Terms</Link>
            <span className="hidden sm:inline">Track every flip · Win every flex</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
