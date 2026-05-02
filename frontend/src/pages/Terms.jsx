import React from "react";
import { Link } from "react-router-dom";
import { Cloud, ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="terms-brand">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-lg tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition" data-testid="terms-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 lg:py-16 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FF8079] font-bold border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1.5 rounded-full">
          <FileText className="h-3 w-3" /> Terms of Service
        </div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tighter font-black uppercase mt-4">Play fair.<br />Track honest.</h1>
        <p className="text-neutral-400 mt-3 text-sm">Last updated: February 2026</p>

        <div className="mt-10 space-y-7 text-neutral-300 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Using CardCloud</h2>
            <p className="mt-3">By creating an account you agree to these terms. You must be at least 13 years old. You're responsible for the accuracy of the data you enter and for keeping your password safe.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Pro subscription</h2>
            <p className="mt-3">CardCloud Pro is billed monthly via Stripe at the price displayed at checkout. Subscriptions auto-renew until cancelled. You can cancel anytime; access continues to the end of the current billing period. Payments are non-refundable except where required by law. Apple App Store purchases (if applicable) are governed by Apple's terms and refund policy.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Acceptable use</h2>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li>Don't upload illegal content or anything you don't have rights to.</li>
              <li>Don't try to break, scrape, or abuse the service.</li>
              <li>Don't impersonate others or share misleading public showcases.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Your content</h2>
            <p className="mt-3">You own your card data and images. You grant CardCloud a limited license to host and display them so we can provide the service to you (and to anyone you choose to share with via public links).</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">No financial advice</h2>
            <p className="mt-3">Profit numbers, AI price estimates, and tax exports are provided for your convenience only. They are not financial, tax, or investment advice. You're responsible for verifying figures with a qualified professional before filing taxes.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Termination</h2>
            <p className="mt-3">We may suspend accounts that violate these terms. You can delete your account at any time by emailing privacy@cardcloud.app.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Disclaimers</h2>
            <p className="mt-3">CardCloud is provided "as is" without warranties of any kind. To the fullest extent permitted by law, our liability is limited to the amount you paid us in the prior 12 months.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Contact</h2>
            <p className="mt-3">Questions? Email <a className="text-[#FF8079] hover:underline" href="mailto:hello@cardcloud.app">hello@cardcloud.app</a>.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-xs uppercase tracking-widest text-neutral-500">
          <Link to="/" className="hover:text-white transition" data-testid="terms-home-link">Home</Link>
          <Link to="/privacy" className="hover:text-white transition" data-testid="terms-privacy-link">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
