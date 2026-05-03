import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Cloud, ArrowLeft, Send, Sparkles, Bug, Lightbulb, LifeBuoy, MessageCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { id: "feature", label: "Feature request", icon: Lightbulb, tint: "bg-[#FFD60A]/15 border-[#FFD60A]/40 text-[#FFD60A]" },
  { id: "bug", label: "Bug report", icon: Bug, tint: "bg-[#FF3B30]/15 border-[#FF3B30]/40 text-[#FF8079]" },
  { id: "support", label: "Support", icon: LifeBuoy, tint: "bg-[#007AFF]/15 border-[#007AFF]/40 text-[#4aa3ff]" },
  { id: "other", label: "Other", icon: MessageCircle, tint: "bg-white/10 border-white/20 text-neutral-300" },
];

export default function Contact() {
  const { user } = useAuth();
  const [category, setCategory] = useState("feature");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill out every field");
      return;
    }
    setBusy(true);
    try {
      const token = localStorage.getItem("cv_token");
      await axios.post(
        `${API}/contact`,
        { name: name.trim(), email: email.trim(), category, subject: subject.trim(), message: message.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setSent(true);
      toast.success("Message sent — thanks for reaching out");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) toast.error("Slow down — please wait a few minutes before sending another message");
      else toast.error(err?.response?.data?.detail || "Send failed — try again in a moment");
    } finally { setBusy(false); }
  };

  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="contact-brand">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-lg tracking-tight font-black uppercase">CardCloud</span>
          </Link>
          <Link to={user ? "/dashboard" : "/"} className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition" data-testid="contact-back">
            <ArrowLeft className="h-4 w-4" /> {user ? "Vault" : "Home"}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10 lg:py-16 relative z-10">
        <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#FF8079] font-bold border border-[#FF3B30]/30 bg-[#FF3B30]/10 px-3 py-1.5 rounded-full">
          <MessageCircle className="h-3 w-3" /> Get in touch
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-black uppercase mt-4 leading-[0.95]">
          Questions, ideas,<br />or caught a bug?
        </h1>
        <p className="text-neutral-400 mt-4 max-w-xl">
          Every message comes straight to my inbox. I read and reply to all of them — usually within a day.
        </p>

        {sent ? (
          <div className="mt-10 rounded-xl border border-[#34C759]/40 bg-gradient-to-br from-[#34C759]/10 via-[#141414] to-[#141414] p-8 text-center fade-up" data-testid="contact-success">
            <div className="mx-auto h-14 w-14 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 grid place-items-center">
              <CheckCircle2 className="h-7 w-7 text-[#34C759]" strokeWidth={2.5} />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase mt-4">Message on its way.</h2>
            <p className="text-neutral-400 mt-2 text-sm max-w-md mx-auto">
              Thanks for the note — I'll reply to <span className="text-white font-semibold">{email}</span> as soon as I can.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => { setSent(false); setSubject(""); setMessage(""); }} variant="outline" className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="contact-send-another">
                Send another
              </Button>
              <Link to={user ? "/dashboard" : "/"} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide text-sm shadow-glow-red transition">
                <Sparkles className="h-4 w-4" /> {user ? "Back to vault" : "Back home"}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 rounded-xl bg-[#141414] border border-white/10 p-6 sm:p-8 space-y-5 fade-up" data-testid="contact-form">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400 mb-2 block">What's this about?</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="contact-category-group">
                {CATEGORIES.map((c) => {
                  const active = c.id === category;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`p-3 rounded-md border transition text-left ${active ? c.tint + " ring-2 ring-offset-2 ring-offset-[#141414]" : "bg-transparent border-white/10 text-neutral-400 hover:text-white hover:border-white/25"}`}
                      data-testid={`contact-category-${c.id}`}
                    >
                      <Icon className="h-4 w-4 mb-1.5" />
                      <div className="text-xs font-black uppercase tracking-wider">{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs tracking-widest uppercase text-neutral-400">Your name</Label>
                <Input value={name} onChange={(ev) => setName(ev.target.value)} className="bg-[#0A0A0A] border-white/10 mt-1.5" maxLength={120} required data-testid="contact-name" />
              </div>
              <div>
                <Label className="text-xs tracking-widest uppercase text-neutral-400">Reply to</Label>
                <Input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} className="bg-[#0A0A0A] border-white/10 mt-1.5" required data-testid="contact-email" />
              </div>
            </div>

            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Subject</Label>
              <Input value={subject} onChange={(ev) => setSubject(ev.target.value)} className="bg-[#0A0A0A] border-white/10 mt-1.5" placeholder={cat.id === "bug" ? "Quick Sell modal won't close on iPhone" : cat.id === "feature" ? "Bulk edit sold prices for multiple cards" : "Help with importing my 2022 inventory"} maxLength={160} required data-testid="contact-subject" />
            </div>

            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Message</Label>
              <textarea
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                rows={7}
                maxLength={4000}
                required
                placeholder={cat.id === "bug" ? "Steps to reproduce + what you saw vs expected. Screenshots help." : cat.id === "feature" ? "Describe the idea + the problem it solves for you." : "Tell me what you're running into."}
                className="w-full mt-1.5 bg-[#0A0A0A] border border-white/10 rounded-md px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF3B30]/50 resize-y leading-relaxed"
                data-testid="contact-message"
              />
              <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500 font-bold text-right" data-testid="contact-char-count">
                {message.length} / 4000
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-neutral-500 max-w-xs">
                By sending, you agree this message may be stored so we can reply. No newsletters, no spam.
              </p>
              <Button type="submit" disabled={busy} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red h-11 px-6" data-testid="contact-submit">
                <Send className="h-4 w-4 mr-2" /> {busy ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
        </div>
      </main>
    </div>
  );
}
