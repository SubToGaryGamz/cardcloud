// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { toast } from "sonner";
import { Cloud, Mail, Lock, User as UserIcon } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const HERO_BG = "https://images.unsplash.com/photo-1642692704112-80f6ba7f6aa3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwyfHxiYXNrZXRiYWxsJTIwY2FyZHxlbnwwfHx8fDE3Nzc2Nzg2Nzd8MA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPwd, setRegPwd] = useState("");

  const onLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/auth/login", { email: loginEmail, password: loginPwd });
      setToken(r.data.token, r.data.user);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const referralCode = (() => {
        try {
          const fromUrl = new URLSearchParams(window.location.search).get("ref");
          if (fromUrl) localStorage.setItem("cv_referral", fromUrl);
          return fromUrl || localStorage.getItem("cv_referral") || undefined;
        } catch { return undefined; }
      })();
      const r = await api.post("/auth/register", { email: regEmail, password: regPwd, name: regName, referral_code: referralCode });
      try { localStorage.removeItem("cv_referral"); } catch {}
      setToken(r.data.token, r.data.user);
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#0A0A0A]" data-testid="login-page">
      {/* Hero side */}
      <div className="relative hidden lg:flex items-end p-12 overflow-hidden">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-5 w-5 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-2xl tracking-tight font-black uppercase">CardCloud</span>
          </div>
          <h1 className="font-display text-5xl xl:text-6xl tracking-tighter font-black uppercase leading-[0.95]">
            Your collection,<br />in the cloud.<br />Profits, tracked.
          </h1>
          <p className="mt-6 text-neutral-300 text-base max-w-sm">
            Every card. Every flip. Costs in, sales out, profit clear as day.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md bg-[#141414] border-white/10 p-8 fade-up">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#FF3B30] to-[#B3261E] grid place-items-center shadow-glow-red">
              <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.15} />
            </div>
            <span className="font-display text-xl tracking-tight font-black uppercase">CardCloud</span>
          </div>
          <div className="mb-6">
            <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">Members area</div>
            <h2 className="font-display text-3xl tracking-tight font-black uppercase mt-1">Sign in</h2>
          </div>

          <Button
            onClick={onGoogle}
            variant="outline"
            className="w-full bg-white text-black hover:bg-white/90 border-0 font-semibold mb-4 h-11"
            data-testid="google-login-button"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs tracking-widest uppercase text-neutral-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 bg-[#0A0A0A] border border-white/10">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-xs tracking-widest uppercase text-neutral-400">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="login-email-input" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="login-pwd" className="text-xs tracking-widest uppercase text-neutral-400">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="login-pwd" type="password" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="login-password-input" />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide h-11" data-testid="login-submit-button">
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-5">
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name" className="text-xs tracking-widest uppercase text-neutral-400">Name</Label>
                  <div className="relative mt-1.5">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="reg-name" required value={regName} onChange={(e) => setRegName(e.target.value)} className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="register-name-input" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reg-email" className="text-xs tracking-widest uppercase text-neutral-400">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="reg-email" type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="register-email-input" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reg-pwd" className="text-xs tracking-widest uppercase text-neutral-400">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input id="reg-pwd" type="password" required minLength={6} value={regPwd} onChange={(e) => setRegPwd(e.target.value)} className="pl-9 bg-[#0A0A0A] border-white/10" data-testid="register-password-input" />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide h-11" data-testid="register-submit-button">
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-neutral-500 mt-6 text-center">
            By continuing you agree to track responsibly.
          </p>
        </Card>
      </div>
    </div>
  );
}
