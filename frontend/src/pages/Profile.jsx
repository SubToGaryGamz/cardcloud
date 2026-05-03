import React, { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import SiteHeader from "../components/SiteHeader";
import MobileBottomNav from "../components/MobileBottomNav";
import BetaCodeDialog from "../components/BetaCodeDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Upload, Save, User as UserIcon, Share2, Copy, ExternalLink, Sparkles, CheckCircle2, Trophy, Gift, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useBilling } from "../context/BillingContext";
import { isNativePlatform } from "../lib/platform";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { isPro, isAnnualPro, proExpiresAt, packages, refresh: refreshBilling } = useBilling();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [referral, setReferral] = useState(null);
  const [lbPrefs, setLbPrefs] = useState({ leaderboard_opt_out: false, leaderboard_show_name: false, leaderboard_handle: "" });
  const fileRef = useRef(null);

  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);
  useEffect(() => { refreshBilling(); }, [refreshBilling]);
  useEffect(() => {
    let alive = true;
    api.get("/me/referral").then((r) => { if (alive) setReferral(r.data); }).catch(() => {});
    api.get("/users/me").then((r) => {
      if (!alive) return;
      const u = r.data || {};
      setLbPrefs({
        leaderboard_opt_out: !!u.leaderboard_opt_out,
        leaderboard_show_name: !!u.leaderboard_show_name,
        leaderboard_handle: u.leaderboard_handle || "",
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const saveLbPrefs = async (patch) => {
    const next = { ...lbPrefs, ...patch };
    setLbPrefs(next);
    try { await api.put("/me/leaderboard-prefs", patch); }
    catch (e) { toast.error(e?.response?.data?.detail || "Couldn't save"); }
  };

  const copyReferralLink = async () => {
    if (!referral?.code) return;
    const url = `${window.location.origin}/?ref=${referral.code}`;
    try { await navigator.clipboard.writeText(url); toast.success("Referral link copied"); }
    catch { toast.error("Copy failed"); }
  };

  useEffect(() => {
    let revoked = false;
    let url = null;
    (async () => {
      if (!user?.avatar_path) { setAvatarUrl(null); return; }
      try {
        const res = await api.get(`/files/${user.avatar_path}`, { responseType: "blob" });
        url = URL.createObjectURL(res.data);
        if (!revoked) setAvatarUrl(url);
      } catch (e) { if (process.env.NODE_ENV !== "production") console.warn("avatar load failed", e); }
    })();
    return () => { revoked = true; if (url) URL.revokeObjectURL(url); };
  }, [user?.avatar_path]);

  const onAvatarChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      await api.post("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refresh();
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.patch("/users/me", { name: name.trim() });
      await refresh();
      toast.success("Profile updated");
    } catch (e) {
      toast.error("Save failed");
    } finally { setSaving(false); }
  };

  const vaultToken = user?.public_vault_token || null;
  const vaultUrl = vaultToken ? `${window.location.origin}/api/share/v/${vaultToken}` : "";

  const toggleVault = async (enabled) => {
    try {
      await api.post("/users/me/public-vault", null, { params: { enabled } });
      await refresh();
      toast.success(enabled ? "Public vault enabled" : "Public vault disabled");
    } catch (e) {
      toast.error("Could not update");
    }
  };

  const copyVaultLink = async () => {
    if (!vaultUrl) return;
    try { await navigator.clipboard.writeText(vaultUrl); toast.success("Link copied"); }
    catch (e) { toast.error("Copy failed"); }
  };

  const onSubscribe = async (packageId = "pro_monthly") => {
    setSubscribing(true);
    try {
      const r = await api.post("/billing/checkout", {
        package_id: packageId,
        origin_url: window.location.origin,
      });
      if (r.data.url) {
        window.location.href = r.data.url;
      } else {
        toast.error("Could not start checkout");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
    } finally {
      setSubscribing(false);
    }
  };

  const [betaDialog, setBetaDialog] = useState(null); // null | "pro_monthly" | "pro_yearly"
  const openBetaDialog = (pkg) => setBetaDialog(pkg);
  const closeBetaDialog = () => setBetaDialog(null);
  const continueToCheckout = (pkg) => { closeBetaDialog(); onSubscribe(pkg); };

  const proExpiryText = proExpiresAt ? new Date(proExpiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
  const proPrice = packages?.pro_monthly?.amount ?? 6;
  const yearlyPrice = packages?.pro_yearly?.amount ?? 65;

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 pb-24 md:pb-12 relative z-10">
        <div className="mb-8">
          <div className="text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /> Account</div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tighter font-black uppercase mt-1">Profile</h1>
        </div>

        <div className="rounded-lg bg-[#141414] border border-white/10 p-6 sm:p-8 fade-up" data-testid="profile-card">
          <div className="flex items-center gap-5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10" data-testid="profile-avatar" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#0A0A0A] ring-2 ring-white/10 grid place-items-center font-display text-3xl font-black text-neutral-400" data-testid="profile-avatar-placeholder">
                {(user?.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="text-neutral-500 text-xs uppercase tracking-widest">{user?.auth_provider === "google" ? "Google account" : "Email account"}</div>
              <div className="text-white font-display text-2xl font-bold">{user?.name}</div>
              <div className="text-neutral-400 text-sm">{user?.email}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} data-testid="avatar-file-input" />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-transparent border-white/15 text-white hover:bg-white/5"
              data-testid="upload-avatar-button"
            >
              <Upload className="h-4 w-4 mr-2" /> {uploading ? "Uploading…" : "Change photo"}
            </Button>
          </div>

          <div className="h-px bg-white/10 my-6" />

          <form onSubmit={saveName} className="space-y-4" data-testid="profile-form">
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0A0A0A] border-white/10 mt-1.5" data-testid="profile-name-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Email</Label>
              <Input value={user?.email || ""} disabled className="bg-[#0A0A0A] border-white/10 mt-1.5 opacity-60 cursor-not-allowed" data-testid="profile-email-input" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide" data-testid="profile-save-button">
                <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>

        {/* Referral */}
        <div className="rounded-lg bg-gradient-to-br from-[#34C759]/8 via-[#141414] to-[#141414] border border-[#34C759]/30 p-6 sm:p-8 mt-6 fade-up" data-testid="referral-card">
          <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-[#34C759] font-semibold">
            <Gift className="h-3.5 w-3.5" /> Refer a friend
          </div>
          <h3 className="font-display text-2xl sm:text-3xl tracking-tighter font-black uppercase mt-1">Give 1 month, get 1 month</h3>
          <p className="text-neutral-400 text-sm mt-1">Share your link. When someone you refer subscribes for the first time, you both get +30 days of Pro automatically.</p>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Your link</div>
              <input
                readOnly
                value={referral ? `${window.location.origin}/?ref=${referral.code}` : "Loading…"}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-md px-3 py-2 text-xs text-white font-mono"
                onFocus={(e) => e.target.select()}
                data-testid="referral-link-input"
              />
            </div>
            <Button
              onClick={copyReferralLink}
              className="bg-[#34C759] hover:bg-[#34C759]/90 text-black font-bold uppercase tracking-wide shrink-0"
              data-testid="referral-copy-button"
            >
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
          </div>
          {referral && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-md bg-black/30 border border-white/5 p-3">
                <div className="font-display text-2xl tracking-tighter font-black text-white">{referral.referred_count}</div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Friends joined</div>
              </div>
              <div className="rounded-md bg-black/30 border border-white/5 p-3">
                <div className="font-display text-2xl tracking-tighter font-black text-[#34C759]">+{referral.rewards_given_months * 30}<span className="text-base text-neutral-500"> days</span></div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Rewards earned</div>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard preferences */}
        <div className="rounded-lg bg-[#141414] border border-white/10 p-6 sm:p-8 mt-6 fade-up" data-testid="leaderboard-prefs-card">
          <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">
            <Trophy className="h-3.5 w-3.5" /> Leaderboard preferences
          </div>
          <h3 className="font-display text-xl tracking-tighter font-black uppercase mt-1">How you appear</h3>
          <p className="text-neutral-400 text-sm mt-1">By default you show up as an anonymous handle. Profit values are never exposed — only your relative rank tier.</p>

          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between gap-4 p-3 rounded-md border border-white/10 cursor-pointer hover:bg-white/[0.02] transition">
              <span className="text-sm">
                <span className="text-white font-semibold">Hide me</span>
                <span className="block text-xs text-neutral-500">Don't include me on the public leaderboard at all.</span>
              </span>
              <input
                type="checkbox"
                checked={!!lbPrefs.leaderboard_opt_out}
                onChange={(e) => saveLbPrefs({ leaderboard_opt_out: e.target.checked })}
                className="h-4 w-4 accent-[#FF3B30]"
                data-testid="lb-opt-out"
              />
            </label>
            <label className="flex items-center justify-between gap-4 p-3 rounded-md border border-white/10 cursor-pointer hover:bg-white/[0.02] transition">
              <span className="text-sm">
                <span className="text-white font-semibold">Show my real name</span>
                <span className="block text-xs text-neutral-500">Replace your anonymous handle with your display name.</span>
              </span>
              <input
                type="checkbox"
                checked={!!lbPrefs.leaderboard_show_name}
                onChange={(e) => saveLbPrefs({ leaderboard_show_name: e.target.checked })}
                disabled={!!lbPrefs.leaderboard_opt_out}
                className="h-4 w-4 accent-[#FF3B30] disabled:opacity-40"
                data-testid="lb-show-name"
              />
            </label>
            <div className="p-3 rounded-md border border-white/10">
              <div className="text-sm text-white font-semibold">Custom handle (optional)</div>
              <p className="text-xs text-neutral-500 mt-0.5">Set your own anonymous handle. Letters, numbers, space, _ or - only · 24 chars max.</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={lbPrefs.leaderboard_handle || ""}
                  onChange={(e) => setLbPrefs({ ...lbPrefs, leaderboard_handle: e.target.value })}
                  placeholder="e.g. SilverSlab"
                  maxLength={24}
                  disabled={!!lbPrefs.leaderboard_opt_out}
                  className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[#FF3B30]/50 disabled:opacity-40"
                  data-testid="lb-handle-input"
                />
                <Button
                  onClick={() => saveLbPrefs({ leaderboard_handle: lbPrefs.leaderboard_handle })}
                  disabled={!!lbPrefs.leaderboard_opt_out}
                  variant="outline"
                  className="bg-transparent border-white/15 text-white hover:bg-white/5"
                  data-testid="lb-handle-save"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Public Vault Showcase */}
        <div className="rounded-lg bg-[#141414] border border-white/10 p-6 sm:p-8 mt-6 fade-up" data-testid="public-vault-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-neutral-500 font-semibold">
                <Share2 className="h-3.5 w-3.5" /> Showcase
              </div>
              <h2 className="font-display text-2xl tracking-tight font-black uppercase mt-1">Public Vault</h2>
              <p className="text-neutral-400 text-sm mt-2 max-w-md">
                Share a read-only view of your collection. Images, names, sports, and tags are shown — costs, sales, and profit stay private.
              </p>
            </div>
            <Switch checked={!!vaultToken} onCheckedChange={toggleVault} data-testid="public-vault-toggle" />
          </div>

          {vaultToken && (
            <div className="mt-5 space-y-2">
              <Label className="text-xs tracking-widest uppercase text-neutral-400">Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={vaultUrl} className="bg-[#0A0A0A] border-white/10 font-mono text-xs" data-testid="public-vault-link" />
                <Button type="button" variant="outline" onClick={copyVaultLink} className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="copy-vault-link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" asChild className="bg-transparent border-white/15 text-white hover:bg-white/5" data-testid="open-vault-link">
                  <a href={vaultUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Pro Subscription */}
        <div className={`rounded-lg border mt-6 p-6 sm:p-8 fade-up ${isPro ? "bg-gradient-to-br from-[#FFD60A]/10 via-[#141414] to-[#141414] border-[#FFD60A]/30" : "bg-gradient-to-br from-[#FF3B30]/10 via-[#141414] to-[#141414] border-[#FF3B30]/30"}`} data-testid="pro-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase font-bold" style={{ color: isPro ? "#FFCC00" : "#FF8079" }}>
                <Sparkles className="h-3.5 w-3.5" /> {isPro ? "Pro · Active" : "Upgrade"}
              </div>
              <h2 className="font-display text-2xl tracking-tight font-black uppercase mt-1">CardCloud Pro</h2>
              {isPro ? (
                <p className="text-neutral-400 text-sm mt-2">
                  You're on Pro. CSV import/export and IRS Form 8949 tax export are unlocked.
                  {proExpiryText && <> Renews on <span className="text-white font-semibold">{proExpiryText}</span>.</>}
                </p>
              ) : (
                <p className="text-neutral-400 text-sm mt-2 max-w-md">
                  Unlock CSV import, CSV export, and a one-click IRS Form 8949 tax export — short-term vs long-term, ready to drop into your filing.
                </p>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Watchlist + eBay sold-comp links</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Unlimited tags per card</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> CSV import (bulk add)</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> CSV export (full backup)</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> IRS Form 8949 tax export</li>
              </ul>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-4xl sm:text-5xl tracking-tighter font-black text-white">${proPrice}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">per month</div>
              {!isPro && (
                <div className="mt-2 text-[10px] uppercase tracking-widest text-[#FFCC00] font-bold">7-day free trial</div>
              )}
            </div>
          </div>

          {!isPro && (
            isNativePlatform() ? (
              <div
                className="mt-5 rounded-md border border-white/10 bg-black/30 p-4 text-sm text-neutral-300"
                data-testid="native-upgrade-notice"
              >
                <div className="text-[10px] uppercase tracking-widest text-[#FF8079] font-bold mb-1">Upgrade on web</div>
                Pro is currently available only on the CardCloud website. Visit{" "}
                <span className="text-white font-semibold">cardcloud.app</span> in your browser to upgrade — your account stays in sync automatically.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => openBetaDialog("pro_monthly")}
                  disabled={subscribing}
                  className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red h-auto py-3 flex-col items-start gap-0.5"
                  data-testid="subscribe-button"
                >
                  <span className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4" /> Start 7-day free trial</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">Then ${proPrice}/mo · Cancel anytime</span>
                </Button>
                <Button
                  onClick={() => openBetaDialog("pro_yearly")}
                  disabled={subscribing}
                  className="bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black font-bold uppercase tracking-wide h-auto py-3 flex-col items-start gap-0.5"
                  data-testid="subscribe-yearly-button"
                >
                  <span className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4" /> Annual — ${yearlyPrice}/yr</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">Save ${(proPrice * 12 - yearlyPrice).toFixed(0)} · 1 month free</span>
                </Button>
              </div>
            )
          )}
        </div>
      </main>

      <MobileBottomNav />

      <BetaCodeDialog
        open={!!betaDialog}
        onClose={closeBetaDialog}
        defaultPackageId={betaDialog || "pro_monthly"}
        priceLabel={betaDialog === "pro_yearly" ? `Continue · $${yearlyPrice}/yr` : "Start 7-day free trial"}
        onContinueToCheckout={continueToCheckout}
      />
    </div>
  );
}
