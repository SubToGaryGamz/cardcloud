import React from "react";
import { Link } from "react-router-dom";
import { Cloud, ArrowLeft, ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="privacy-brand">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-lg tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition" data-testid="privacy-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 lg:py-16 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FF8079] font-bold border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1.5 rounded-full">
          <ShieldCheck className="h-3 w-3" /> Privacy Policy
        </div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tighter font-black uppercase mt-4">Your data,<br />in your vault.</h1>
        <p className="text-neutral-400 mt-3 text-sm">Last updated: February 2026</p>

        <div className="prose prose-invert mt-10 space-y-7 text-neutral-300 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">What we collect</h2>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li><span className="text-white font-semibold">Account info</span> — your email, display name, optional profile photo. If you sign in with Google, we receive your basic profile (name, email, avatar URL) only.</li>
              <li><span className="text-white font-semibold">Card data you enter</span> — names, years, prices paid, sale prices, fees, tags, conditions, dates, and any images you upload.</li>
              <li><span className="text-white font-semibold">Billing</span> — when you subscribe to Pro, payment is processed by Stripe. We never see or store your card number; Stripe returns a customer ID and subscription metadata only.</li>
              <li><span className="text-white font-semibold">Basic technical data</span> — server logs (IP, user agent, timestamp) for security and debugging.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">How we use it</h2>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li>Show you your collection, profits, and analytics.</li>
              <li>Authenticate your sessions and protect your account.</li>
              <li>Generate AI price estimates for your watchlist (Anthropic Claude / Emergent Universal Key) — only the card name + year are sent.</li>
              <li>Process Pro subscriptions and renewals (Stripe).</li>
              <li>Email you transactional notices (e.g. password reset, receipt) — never marketing without explicit opt-in.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Public Showcase &amp; sharing</h2>
            <p className="mt-3">
              When you generate a public share link for a card, or enable your Public Vault, anyone with that URL can view <span className="text-white font-semibold">images, names, sport, and tags</span> of those cards. Cost basis, sale prices, fees, and profit are <span className="text-white font-semibold">never</span> exposed publicly. Revoking a link instantly disables access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Data retention &amp; deletion</h2>
            <p className="mt-3">
              Your data lives in your account until you delete it. You can delete any card at any time. To delete your entire account and all associated data, email us at <a className="text-[#FF8079] hover:underline" href="mailto:privacy@cardcloud.app">privacy@cardcloud.app</a> and we will fully purge your records within 30 days. Backups roll off within 60 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Third-party services we use</h2>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li><span className="text-white font-semibold">Stripe</span> — payment processing for Pro.</li>
              <li><span className="text-white font-semibold">Google</span> — optional Sign-in (you can use email/password instead).</li>
              <li><span className="text-white font-semibold">Anthropic / Emergent Integrations</span> — AI price estimation (card name + year only, no PII).</li>
              <li><span className="text-white font-semibold">PostHog</span> — anonymous product analytics, used to fix bugs and improve features. You can opt out in your browser settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Children</h2>
            <p className="mt-3">CardCloud is not directed at children under 13. We do not knowingly collect personal data from children. Contact us if you believe we have.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Your rights</h2>
            <p className="mt-3">You can access, export (Pro), correct, or delete your data at any time. Residents of the EU/UK (GDPR), California (CCPA), and similar jurisdictions have additional rights — contact us to exercise them.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Contact</h2>
            <p className="mt-3">
              Questions? Email <a className="text-[#FF8079] hover:underline" href="mailto:privacy@cardcloud.app">privacy@cardcloud.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Changes</h2>
            <p className="mt-3">We will post any material changes here and update the "Last updated" date. Continued use after changes constitutes acceptance.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500">
          <Link to="/" className="hover:text-white transition" data-testid="privacy-home-link">Home</Link>
          <Link to="/terms" className="hover:text-white transition" data-testid="privacy-terms-link">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}
