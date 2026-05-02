import React, { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import SiteHeader from "../components/SiteHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Upload, Save, User as UserIcon, Share2, Copy, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useBilling } from "../context/BillingContext";
import { isNativePlatform } from "../lib/platform";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { isPro, proExpiresAt, packages, refresh: refreshBilling } = useBilling();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);
  useEffect(() => { refreshBilling(); }, [refreshBilling]);

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
  const vaultUrl = vaultToken ? `${window.location.origin}/s/v/${vaultToken}` : "";

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

  const onSubscribe = async () => {
    setSubscribing(true);
    try {
      const r = await api.post("/billing/checkout", {
        package_id: "pro_monthly",
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

  const proExpiryText = proExpiresAt ? new Date(proExpiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
  const proPrice = packages?.pro_monthly?.amount ?? 6;

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-grain">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 lg:py-12 relative z-10">
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
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Watchlist + AI price estimates</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> Unlimited tags per card</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> CSV import (bulk add)</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> CSV export (full backup)</li>
                <li className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="h-4 w-4 text-[#34C759]" /> IRS Form 8949 tax export</li>
              </ul>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-4xl sm:text-5xl tracking-tighter font-black text-white">${proPrice}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">per month</div>
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
              <Button
                onClick={onSubscribe}
                disabled={subscribing}
                className="mt-5 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white font-bold uppercase tracking-wide shadow-glow-red"
                data-testid="subscribe-button"
              >
                <Sparkles className="h-4 w-4 mr-2" /> {subscribing ? "Redirecting…" : `Upgrade for $${proPrice}/mo`}
              </Button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
