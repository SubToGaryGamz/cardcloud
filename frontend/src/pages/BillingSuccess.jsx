import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Cloud, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../lib/api";

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "checking", message: "Confirming your payment…" });
  const polled = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "error", message: "Missing session id." });
      return;
    }
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await api.get(`/billing/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          setState({ status: "paid", message: "You're now CardCloud Pro." });
          return;
        }
        if (r.data.status === "expired") {
          setState({ status: "error", message: "Payment session expired. Please try again." });
          return;
        }
        polled.current += 1;
        if (polled.current >= 6) {
          setState({ status: "pending", message: "Payment is still processing. Refresh later or contact support." });
          return;
        }
        setTimeout(poll, 2000);
      } catch (e) {
        setState({ status: "error", message: e?.response?.data?.detail || "Could not verify payment." });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#0A0A0A] bg-grain px-4">
      <div className="w-full max-w-md rounded-lg bg-[#141414] border border-white/10 p-8 text-center fade-up" data-testid="billing-success-page">
        <div className="mx-auto h-12 w-12 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red mb-4">
          <Cloud className="h-6 w-6 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
        </div>
        {state.status === "paid" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-[#34C759] mx-auto mb-3" />
            <h1 className="font-display text-3xl tracking-tighter font-black uppercase">Welcome to Pro</h1>
            <p className="text-neutral-400 mt-2 text-sm">{state.message}</p>
            <button onClick={() => navigate("/dashboard")} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide transition" data-testid="billing-go-vault">
              Open my vault
            </button>
          </>
        )}
        {state.status === "checking" && (
          <>
            <h1 className="font-display text-3xl tracking-tighter font-black uppercase mt-2">Confirming…</h1>
            <p className="text-neutral-400 mt-2 text-sm">{state.message}</p>
            <div className="mt-5 flex justify-center"><span className="h-2 w-2 rounded-full bg-[#FF3B30] animate-ping" /></div>
          </>
        )}
        {state.status === "pending" && (
          <>
            <AlertCircle className="h-10 w-10 text-[#FFCC00] mx-auto mb-3" />
            <h1 className="font-display text-2xl tracking-tighter font-black uppercase">Still processing</h1>
            <p className="text-neutral-400 mt-2 text-sm">{state.message}</p>
            <button onClick={() => navigate("/profile")} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-white/15 text-white font-semibold uppercase tracking-wide hover:bg-white/5 transition">Back to profile</button>
          </>
        )}
        {state.status === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-[#FF3B30] mx-auto mb-3" />
            <h1 className="font-display text-2xl tracking-tighter font-black uppercase">Something went wrong</h1>
            <p className="text-neutral-400 mt-2 text-sm">{state.message}</p>
            <button onClick={() => navigate("/profile")} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-white/15 text-white font-semibold uppercase tracking-wide hover:bg-white/5 transition">Back to profile</button>
          </>
        )}
      </div>
    </div>
  );
}
