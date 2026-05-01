// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login", { replace: true });
      return;
    }
    const session_id = m[1];

    (async () => {
      try {
        const r = await api.post("/auth/session", { session_id });
        setToken(r.data.token, r.data.user);
        // Strip hash and go to dashboard
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: r.data.user } });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]" data-testid="auth-callback-loader">
      <div className="text-white/70 font-display tracking-widest uppercase">Signing you in…</div>
    </div>
  );
}
